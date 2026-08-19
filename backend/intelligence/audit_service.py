import logging
from datetime import datetime, date
from django.utils import timezone
from django.db.models import Q, Count
from django.contrib.auth import get_user_model
from .models import AuditLog, AuditEventType, AuditEventCategory

logger = logging.getLogger(__name__)

# Sensitive key substrings that should be redacted from audit metadata
SENSITIVE_KEYS = {
    'password', 'passwd', 'secret', 'token', 'authorization', 'cookie',
    'session', 'jwt', 'auth_header', 'private_key', 'api_key', 'mfa_secret',
    'otp', 'otp_code', 'access_token', 'refresh_token', 'credentials',
    'cvv', 'card_number', 'pin'
}


def sanitize_value(val):
    """Recursively clean nested data structures and redact sensitive values."""
    if isinstance(val, dict):
        cleaned = {}
        for k, v in val.items():
            k_str = str(k).lower()
            if any(sensitive in k_str for sensitive in SENSITIVE_KEYS):
                cleaned[k] = '[REDACTED]'
            else:
                cleaned[k] = sanitize_value(v)
        return cleaned
    elif isinstance(val, (list, tuple, set)):
        return [sanitize_value(item) for item in val]
    elif isinstance(val, (datetime, date)):
        return val.isoformat()
    elif isinstance(val, (str, int, float, bool)) or val is None:
        if isinstance(val, str) and (val.startswith(('Bearer ', 'eyJhbGciOi')) or len(val) > 128 and not ' ' in val):
            # Redact bearer tokens or raw JWT strings
            if val.startswith(('Bearer ', 'eyJhbGciOi')):
                return '[REDACTED_TOKEN]'
        return val
    else:
        return str(val)


def get_client_ip(request):
    """Safely extract the client IP address from a request context."""
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
        return ip
    return request.META.get('REMOTE_ADDR')


class AuditLogService:
    @staticmethod
    def record(
        actor=None,
        action="",
        event_type=AuditEventType.SYSTEM_HEALTH_CHECK,
        category=None,
        resource_type="System",
        resource_id=None,
        station=None,
        description="",
        metadata=None,
        status="SUCCESS",
        ip_address=None,
        request=None,
    ):
        """
        Record an operational audit log entry.
        Guaranteed not to raise an exception or abort the calling transaction.
        """
        try:
            # 1. Resolve Actor
            if actor is None and request and hasattr(request, 'user') and request.user.is_authenticated:
                actor = request.user

            # 2. Resolve Station if missing
            if station is None:
                if actor and hasattr(actor, 'station') and actor.station:
                    station = actor.station

            # 3. Resolve IP Address
            if ip_address is None and request:
                ip_address = get_client_ip(request)

            # 4. Sanitize Metadata
            clean_metadata = sanitize_value(metadata or {})

            # 5. Build and validate description / action
            if not description and action:
                description = action
            elif not action and description:
                action = description[:250]

            # 6. Create Audit Record
            audit_entry = AuditLog.objects.create(
                actor=actor,
                action=str(action)[:255],
                category=category or AuditEventCategory.SYSTEM,
                event_type=str(event_type),
                description=str(description),
                resource_type=str(resource_type)[:100],
                resource_id=str(resource_id) if resource_id is not None else None,
                station=station,
                metadata=clean_metadata,
                status=str(status)[:50],
                ip_address=ip_address,
            )
            return audit_entry
        except Exception as e:
            logger.exception("AuditLogService.record failed to save audit log: %s", e)
            return None

    @staticmethod
    def get_audit_logs(user, params=None):
        """
        Retrieve audit logs with strict station isolation and multidimensional filters.
        """
        params = params or {}
        queryset = AuditLog.objects.select_related('actor', 'station').all()

        # RBAC / Station Boundary
        if user.role == 'STATION':
            if user.station:
                queryset = queryset.filter(station=user.station)
            else:
                # If station user has no assigned station, they see only actions by themselves
                queryset = queryset.filter(actor=user)
        elif user.role == 'PATROL_OFFICER':
            if user.station:
                queryset = queryset.filter(Q(station=user.station) | Q(actor=user))
            else:
                queryset = queryset.filter(actor=user)
        elif user.role == 'ADMIN':
            # Admin can see all, or filter by specific station if supplied
            station_id = params.get('station_id') or params.get('station')
            if station_id:
                queryset = queryset.filter(station_id=station_id)
        else:
            # Deny / empty for unknown roles
            return AuditLog.objects.none()

        # Filtering: category
        category = params.get('category')
        if category and category != 'ALL':
            queryset = queryset.filter(category=category)

        # Filtering: event_type
        event_type = params.get('event_type')
        if event_type:
            queryset = queryset.filter(event_type=event_type)

        # Filtering: resource_type
        resource_type = params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type__iexact=resource_type)

        # Filtering: resource_id
        resource_id = params.get('resource_id')
        if resource_id:
            queryset = queryset.filter(resource_id=str(resource_id))

        # Filtering: actor
        actor_id = params.get('actor_id') or params.get('actor')
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)

        # Filtering: status
        status_val = params.get('status')
        if status_val:
            queryset = queryset.filter(status__iexact=status_val)

        # Filtering: Date Range
        start_date = params.get('start_date') or params.get('date_from')
        if start_date:
            try:
                if len(str(start_date)) == 10:
                    queryset = queryset.filter(timestamp__date__gte=start_date)
                else:
                    queryset = queryset.filter(timestamp__gte=start_date)
            except Exception:
                pass

        end_date = params.get('end_date') or params.get('date_to')
        if end_date:
            try:
                if len(str(end_date)) == 10:
                    queryset = queryset.filter(timestamp__date__lte=end_date)
                else:
                    queryset = queryset.filter(timestamp__lte=end_date)
            except Exception:
                pass

        # Filtering: Search (description, action, resource_id, actor username)
        search = params.get('search')
        if search:
            search_term = str(search).strip()
            queryset = queryset.filter(
                Q(description__icontains=search_term) |
                Q(action__icontains=search_term) |
                Q(resource_id__icontains=search_term) |
                Q(actor__username__icontains=search_term)
            )

        return queryset.order_by('-timestamp')

    @staticmethod
    def get_audit_summary(user, params=None):
        """
        Calculates database-backed KPI metrics and breakdowns for audit logs.
        """
        params = params or {}
        base_qs = AuditLogService.get_audit_logs(user, params)

        now = timezone.now()
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        last_24h = now - timezone.timedelta(hours=24)

        total_events = base_qs.count()
        events_today = base_qs.filter(timestamp__gte=start_of_today).count()
        events_last_24h = base_qs.filter(timestamp__gte=last_24h).count()

        # Category Breakdown
        categories_data = base_qs.values('category').annotate(count=Count('id')).order_by('-count')
        by_category = {item['category']: item['count'] for item in categories_data}

        # Active Operators (users who performed actions)
        active_operators_count = base_qs.filter(actor__isnull=False).values('actor').distinct().count()

        # Top 5 most active users
        top_users_data = (
            base_qs.filter(actor__isnull=False)
            .values('actor__id', 'actor__username', 'actor__role', 'actor__station__name')
            .annotate(event_count=Count('id'))
            .order_by('-event_count')[:5]
        )
        most_active_users = [
            {
                'id': u['actor__id'],
                'username': u['actor__username'],
                'role': u['actor__role'],
                'station': u['actor__station__name'],
                'count': u['event_count'],
            }
            for u in top_users_data
        ]

        # Top 5 most common actions
        common_actions_data = (
            base_qs.values('event_type')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        most_common_actions = [
            {'event_type': a['event_type'], 'count': a['count']}
            for a in common_actions_data
        ]

        # Security & Critical Events (AUTH failures, lockouts, critical status changes)
        security_events_count = base_qs.filter(
            Q(category=AuditEventCategory.AUTH) |
            Q(event_type__in=[
                AuditEventType.LOGIN_FAILURE,
                AuditEventType.MFA_VERIFY_FAILURE,
                AuditEventType.PATROL_CANCELLED,
            ]) |
            Q(status__iexact='FAILED')
        ).count()

        recent_critical_events = (
            base_qs.filter(
                Q(category=AuditEventCategory.AUTH) |
                Q(event_type__in=[
                    AuditEventType.LOGIN_FAILURE,
                    AuditEventType.MFA_VERIFY_FAILURE,
                    AuditEventType.PATROL_CANCELLED,
                ]) |
                Q(status__iexact='FAILED')
            )
            .select_related('actor', 'station')
            .order_by('-timestamp')[:5]
        )

        from .serializers import AuditLogSerializer
        serialized_critical = AuditLogSerializer(recent_critical_events, many=True).data

        return {
            'total_events': total_events,
            'events_today': events_today,
            'events_last_24h': events_last_24h,
            'active_operators': active_operators_count,
            'security_events_count': security_events_count,
            'by_category': by_category,
            'most_active_users': most_active_users,
            'most_common_actions': most_common_actions,
            'recent_critical_events': serialized_critical,
        }
