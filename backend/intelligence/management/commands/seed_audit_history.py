import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

from intelligence.models import AuditLog, AuditEventType, AuditEventCategory
from crimes.models import FIR, Incident, Complaint, Evidence
from patrol.models import PatrolAssignment
from users.models import PoliceStation

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds realistic operational audit records for all existing FIRs, Incidents, Patrols, Complaints, and System events.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Beginning audit history synchronization & seeding...'))

        now = timezone.now()
        admin_user = User.objects.filter(role='ADMIN').first()
        if not admin_user:
            admin_user = User.objects.create_superuser('admin', 'admin@cybersphere.local', 'admin123')

        created_count = 0

        with transaction.atomic():
            # 1. FIR Audits
            default_station = PoliceStation.objects.first()
            for i, fir in enumerate(FIR.objects.all()):
                stn = fir.reported_by.station if (fir.reported_by and fir.reported_by.station) else getattr(fir, 'station', default_station)
                ts = fir.date_reported or (now - datetime.timedelta(hours=i * 6 + 2))
                log, created = AuditLog.objects.get_or_create(
                    event_type=AuditEventType.FIR_CREATED,
                    resource_type='FIR',
                    resource_id=fir.fir_number,
                    defaults={
                        'actor': fir.reported_by or admin_user,
                        'category': AuditEventCategory.FIR,
                        'action': f"Registered First Information Report #{fir.fir_number}",
                        'description': f"Official FIR registered: {fir.description[:120]}...",
                        'station': stn,
                        'status': 'SUCCESS',
                        'metadata': {
                            'fir_number': fir.fir_number,
                            'status': fir.status,
                            'jurisdiction': stn.name if stn else 'Citywide HQ',
                        }
                    }
                )
                if created:
                    AuditLog.objects.filter(id=log.id).update(timestamp=ts)
                    created_count += 1

            # 2. Incident Audits
            for j, inc in enumerate(Incident.objects.all()):
                ts = inc.date_occurred or (now - datetime.timedelta(hours=j * 4 + 1))
                log, created = AuditLog.objects.get_or_create(
                    event_type=AuditEventType.INCIDENT_CREATED,
                    resource_type='Incident',
                    resource_id=str(inc.id),
                    defaults={
                        'actor': admin_user,
                        'category': AuditEventCategory.INCIDENT,
                        'action': f"Filed Incident #{inc.id}: {inc.title}",
                        'description': f"Critical incident recorded in precinct: {inc.description[:120]}...",
                        'station': inc.station,
                        'status': 'SUCCESS',
                        'metadata': {
                            'title': inc.title,
                            'severity': inc.severity,
                            'status': inc.status,
                            'station': inc.station.name if inc.station else 'Citywide HQ',
                        }
                    }
                )
                if created:
                    AuditLog.objects.filter(id=log.id).update(timestamp=ts)
                    created_count += 1

                if inc.status in ['RESOLVED', 'CLOSED']:
                    res_ts = ts + datetime.timedelta(hours=2)
                    log2, created2 = AuditLog.objects.get_or_create(
                        event_type=AuditEventType.INCIDENT_STATUS_CHANGED,
                        resource_type='Incident',
                        resource_id=str(inc.id),
                        defaults={
                            'actor': admin_user,
                            'category': AuditEventCategory.INCIDENT,
                            'action': f"Updated Incident #{inc.id} status to {inc.status}",
                            'description': f"Investigation resolved scene for incident: {inc.title}",
                            'station': inc.station,
                            'status': 'SUCCESS',
                            'metadata': {
                                'title': inc.title,
                                'old_status': 'PENDING',
                                'new_status': inc.status,
                            }
                        }
                    )
                    if created2:
                        AuditLog.objects.filter(id=log2.id).update(timestamp=res_ts)
                        created_count += 1

            # 3. Patrol Assignment Audits
            for k, p in enumerate(PatrolAssignment.objects.all()):
                ts = p.start_time or (now - datetime.timedelta(hours=k * 3 + 1))
                log, created = AuditLog.objects.get_or_create(
                    event_type=AuditEventType.PATROL_DISPATCHED,
                    resource_type='PatrolAssignment',
                    resource_id=str(p.id),
                    defaults={
                        'actor': admin_user,
                        'category': AuditEventCategory.PATROL,
                        'action': f"Dispatched Patrol Unit P-{p.id:03d} to {p.zone_name}",
                        'description': f"Unit assigned to {p.officer.username} with {p.priority} priority. Instructions: {p.instructions[:100]}",
                        'station': p.station,
                        'status': 'SUCCESS',
                        'metadata': {
                            'unit_id': f"P-{p.id:03d}",
                            'officer': p.officer.username,
                            'zone': p.zone_name,
                            'priority': p.priority,
                            'status': p.status,
                        }
                    }
                )
                if created:
                    AuditLog.objects.filter(id=log.id).update(timestamp=ts)
                    created_count += 1

                if p.status in ['ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED']:
                    st_map = {
                        'ACKNOWLEDGED': AuditEventType.PATROL_ACKNOWLEDGED,
                        'EN_ROUTE': AuditEventType.PATROL_STATUS_CHANGED,
                        'ARRIVED': AuditEventType.PATROL_ARRIVED,
                        'COMPLETED': AuditEventType.PATROL_COMPLETED,
                    }
                    ev_type = st_map.get(p.status, AuditEventType.PATROL_STATUS_CHANGED)
                    log_st, created_st = AuditLog.objects.get_or_create(
                        event_type=ev_type,
                        resource_type='PatrolAssignment',
                        resource_id=str(p.id),
                        defaults={
                            'actor': p.officer,
                            'category': AuditEventCategory.PATROL,
                            'action': f"Patrol Unit P-{p.id:03d} transitioned to {p.status}",
                            'description': f"Officer {p.officer.username} updated status in beat {p.zone_name}",
                            'station': p.station,
                            'status': 'SUCCESS',
                            'metadata': {
                                'officer': p.officer.username,
                                'new_status': p.status,
                                'zone': p.zone_name,
                            }
                        }
                    )
                    if created_st:
                        AuditLog.objects.filter(id=log_st.id).update(timestamp=ts + datetime.timedelta(minutes=15))
                        created_count += 1

            # 4. Complaint Audits
            for c_idx, comp in enumerate(Complaint.objects.all()):
                ts = comp.date_filed or (now - datetime.timedelta(hours=c_idx * 5 + 3))
                log_c, created_c = AuditLog.objects.get_or_create(
                    event_type=AuditEventType.COMPLAINT_CREATED,
                    resource_type='Complaint',
                    resource_id=str(comp.id),
                    defaults={
                        'actor': admin_user,
                        'category': AuditEventCategory.COMPLAINT,
                        'action': f"Received Citizen Complaint #{comp.id}",
                        'description': f"Public complaint recorded: {comp.description[:100]}",
                        'station': comp.station,
                        'status': 'SUCCESS',
                        'metadata': {
                            'complaint_id': comp.id,
                            'status': comp.status,
                            'station': comp.station.name if comp.station else 'Citywide HQ',
                        }
                    }
                )
                if created_c:
                    AuditLog.objects.filter(id=log_c.id).update(timestamp=ts)
                    created_count += 1

            # 5. User Audits
            for u_idx, u in enumerate(User.objects.all()):
                ts = now - datetime.timedelta(days=7 - u_idx if u_idx < 7 else 1)
                log_u, created_u = AuditLog.objects.get_or_create(
                    event_type=AuditEventType.USER_CREATED,
                    resource_type='User',
                    resource_id=str(u.id),
                    defaults={
                        'actor': admin_user,
                        'category': AuditEventCategory.USER,
                        'action': f"Provisioned User Account '{u.username}'",
                        'description': f"User account created with role {u.role} for jurisdiction {u.station.name if u.station else 'Citywide HQ'}",
                        'station': u.station,
                        'status': 'SUCCESS',
                        'metadata': {
                            'username': u.username,
                            'role': u.role,
                            'station': u.station.name if u.station else 'Citywide HQ',
                        }
                    }
                )
                if created_u:
                    AuditLog.objects.filter(id=log_u.id).update(timestamp=ts)
                    created_count += 1

            # 6. Intelligence Analytics Audits
            stations = PoliceStation.objects.all()
            for s_idx, stn in enumerate(stations):
                ts = now - datetime.timedelta(hours=s_idx * 3 + 2)
                log_intel, created_intel = AuditLog.objects.get_or_create(
                    event_type=AuditEventType.AI_PREDICTION_GENERATED,
                    resource_type='RiskScore',
                    resource_id=f"RISK-{stn.station_code}",
                    defaults={
                        'actor': admin_user,
                        'category': AuditEventCategory.INTELLIGENCE,
                        'action': f"Computed AI Risk Index for {stn.name}",
                        'description': f"Spatial-temporal machine learning model evaluated hotspot vectors and density scores for {stn.name}",
                        'station': stn,
                        'status': 'SUCCESS',
                        'metadata': {
                            'station_code': stn.station_code,
                            'station_name': stn.name,
                            'model': 'K-Means + Spatial Density Matrix',
                        }
                    }
                )
                if created_intel:
                    AuditLog.objects.filter(id=log_intel.id).update(timestamp=ts)
                    created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully synchronized {created_count} operational audit records across all categories! Total audit logs now: {AuditLog.objects.count()}'))
