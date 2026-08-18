import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from crimes.models import Incident
from patrol.models import PatrolLocation, PatrolAssignment

logger = logging.getLogger(__name__)


def safe_group_send(group_name, message_type, data):
    """
    Safely send messages across Channel Groups using the default channel layer.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": message_type,
                    "data": data,
                }
            )
    except Exception as e:
        logger.warning(f"Failed to broadcast real-time event to group {group_name}: {e}")


@receiver(post_save, sender=Incident)
def incident_realtime_broadcast(sender, instance, created, **kwargs):
    """
    Broadcast live incident creation and status changes to connected Command Center consumers.
    """
    coords = None
    if instance.location:
        try:
            coords = [instance.location.x, instance.location.y]
        except Exception:
            coords = None

    station_id = instance.station_id
    station_name = instance.station.name if instance.station else None

    date_val = getattr(instance, 'date_occurred', None) or getattr(instance, 'created_at', None)
    if hasattr(date_val, 'isoformat'):
        date_str = date_val.isoformat()
    elif date_val is not None:
        date_str = str(date_val)
    else:
        date_str = None

    incident_data = {
        "id": instance.id,
        "title": instance.title,
        "description": instance.description or "",
        "crime_type": getattr(instance, 'crime_type', getattr(instance, 'incident_type', 'GENERAL')),
        "severity": instance.severity,
        "status": instance.status,
        "station_id": station_id,
        "station_name": station_name,
        "location": {"type": "Point", "coordinates": coords} if coords else None,
        "created_at": date_str,
    }

    if created:
        payload = {
            "type": "incident_created",
            "incident": incident_data,
            "message": f"New incident reported: #{instance.id} {instance.title}",
        }
        # Broadcast to Admin / Global
        safe_group_send("global_monitoring", "incident_event", payload)
        # Broadcast to Station precinct
        if station_id:
            safe_group_send(f"station_{station_id}", "incident_event", payload)

        # Critical / High Severity Alert
        if instance.severity in ['CRITICAL', 'HIGH']:
            alert_payload = {
                "type": "critical_alert",
                "alert_id": f"inc-{instance.id}-{instance.severity.lower()}",
                "severity": instance.severity,
                "title": f"PRIORITY ALERT: {instance.severity} INCIDENT",
                "message": f"#{instance.id} — {instance.title} ({station_name or 'Central'})",
                "incident_id": instance.id,
                "timestamp": incident_data["created_at"],
            }
            safe_group_send("global_monitoring", "alert_event", alert_payload)
            if station_id:
                safe_group_send(f"station_{station_id}", "alert_event", alert_payload)

    else:
        payload = {
            "type": "incident_updated",
            "incident": incident_data,
            "message": f"Incident #{instance.id} updated: {instance.status} ({instance.severity})",
        }
        safe_group_send("global_monitoring", "incident_event", payload)
        if station_id:
            safe_group_send(f"station_{station_id}", "incident_event", payload)


@receiver(post_save, sender=PatrolLocation)
def patrol_location_realtime_broadcast(sender, instance, created, **kwargs):
    """
    Broadcast live patrol GPS breadcrumbs to Command Center maps and active trackers.
    """
    assignment = instance.assignment
    if not assignment:
        return

    officer = assignment.officer
    station_id = assignment.station_id

    lat = instance.location.y if instance.location else None
    lng = instance.location.x if instance.location else None

    if lat is None or lng is None:
        return

    t_val = getattr(instance, 'timestamp', None) or getattr(instance, 'recorded_at', None)
    if hasattr(t_val, 'isoformat'):
        t_str = t_val.isoformat()
    elif t_val is not None:
        t_str = str(t_val)
    else:
        t_str = None

    payload = {
        "type": "patrol_location_updated",
        "assignment_id": assignment.id,
        "officer_id": officer.id if officer else None,
        "officer_name": officer.username if officer else "Patrol Unit",
        "station_id": station_id,
        "latitude": lat,
        "longitude": lng,
        "speed": getattr(instance, 'speed', 0.0),
        "recorded_at": t_str,
    }

    safe_group_send("global_monitoring", "patrol_event", payload)
    if station_id:
        safe_group_send(f"station_{station_id}", "patrol_event", payload)
    if officer:
        safe_group_send(f"patrol_{officer.id}", "patrol_event", payload)
