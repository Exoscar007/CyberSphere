from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta
from django.utils import timezone

from users.models import PoliceStation
from crimes.models import FIR, Incident, Complaint, Evidence
from patrol.models import PatrolAssignment
from intelligence.models import AuditLog, AuditEventType, AuditEventCategory
from intelligence.audit_service import AuditLogService, sanitize_value

User = get_user_model()


class AuditLogModelAndServiceTests(TestCase):
    def setUp(self):
        self.station_a = PoliceStation.objects.create(
            station_code="STN-A",
            name="Station Alpha",
            address="Alpha Road"
        )
        self.station_b = PoliceStation.objects.create(
            station_code="STN-B",
            name="Station Beta",
            address="Beta Road"
        )
        self.admin = User.objects.create_user(
            username="admin_test",
            password="adminpassword123",
            role="ADMIN"
        )
        self.station_user_a = User.objects.create_user(
            username="station_a_officer",
            password="officerpassword123",
            role="STATION",
            station=self.station_a
        )
        self.station_user_b = User.objects.create_user(
            username="station_b_officer",
            password="officerpassword123",
            role="STATION",
            station=self.station_b
        )

    def test_01_audit_record_creation_and_associations(self):
        """1, 2, 3, 4, 5: Verify creation, actor, resource, station, timestamp correctness."""
        log = AuditLogService.record(
            actor=self.station_user_a,
            action="Created FIR #FIR-ALPHA-001",
            event_type=AuditEventType.FIR_CREATED,
            category=AuditEventCategory.FIR,
            resource_type="FIR",
            resource_id="FIR-ALPHA-001",
            station=self.station_a,
            description="First Information Report for Alpha zone",
            metadata={"notes": "Priority case", "value": 100}
        )

        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.station_user_a)
        self.assertEqual(log.station, self.station_a)
        self.assertEqual(log.resource_type, "FIR")
        self.assertEqual(log.resource_id, "FIR-ALPHA-001")
        self.assertEqual(log.event_type, AuditEventType.FIR_CREATED)
        self.assertEqual(log.category, AuditEventCategory.FIR)
        self.assertIsNotNone(log.timestamp)
        self.assertLessEqual(log.timestamp, timezone.now())

    def test_02_metadata_sanitization_and_no_secret_leakage(self):
        """12, 13: Verify passwords, JWT tokens, MFA secrets, and API keys are redacted."""
        raw_metadata = {
            "username": "target_user",
            "password": "SuperSecretPassword123!",
            "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
            "mfa_secret": "JBSWY3DPEHPK3PXP",
            "api_key": "sk_live_1234567890",
            "nested": {
                "user_password": "nested_password",
                "normal_field": "safe_information",
                "authorization_header": "Bearer eyJhbGciOi...",
            },
            "card_number": "4111222233334444",
            "safe_counter": 42
        }

        cleaned = sanitize_value(raw_metadata)
        self.assertEqual(cleaned["password"], "[REDACTED]")
        self.assertEqual(cleaned["auth_token"], "[REDACTED]")
        self.assertEqual(cleaned["mfa_secret"], "[REDACTED]")
        self.assertEqual(cleaned["api_key"], "[REDACTED]")
        self.assertEqual(cleaned["card_number"], "[REDACTED]")
        self.assertEqual(cleaned["nested"]["user_password"], "[REDACTED]")
        self.assertEqual(cleaned["nested"]["authorization_header"], "[REDACTED]")
        self.assertEqual(cleaned["nested"]["normal_field"], "safe_information")
        self.assertEqual(cleaned["safe_counter"], 42)

        # Confirm saved audit record also sanitizes metadata
        log = AuditLogService.record(
            actor=self.admin,
            action="Admin security audit",
            event_type=AuditEventType.SYSTEM_HEALTH_CHECK,
            metadata=raw_metadata
        )
        self.assertEqual(log.metadata["password"], "[REDACTED]")
        self.assertEqual(log.metadata["mfa_secret"], "[REDACTED]")

    def test_03_audit_failure_does_not_break_business_operation(self):
        """14: Verify exception in audit logging does not crash callers."""
        # Intentionally cause a type or mock error in record
        res = AuditLogService.record(
            actor="INVALID_NON_MODEL_OBJECT",
            action="Fail test",
            event_type="INVALID"
        )
        # Should gracefully return None without raising exception
        self.assertIsNone(res)


class AuditLogAPITests(TestCase):
    def setUp(self):
        self.station_a = PoliceStation.objects.create(
            station_code="STN-A",
            name="Navrangpura Precinct",
            address="Navrangpura"
        )
        self.station_b = PoliceStation.objects.create(
            station_code="STN-B",
            name="Satellite Precinct",
            address="Satellite"
        )
        self.admin = User.objects.create_user(
            username="admin_user",
            password="adminpassword123",
            role="ADMIN"
        )
        self.station_user_a = User.objects.create_user(
            username="officer_navrangpura",
            password="officerpassword123",
            role="STATION",
            station=self.station_a
        )
        self.station_user_b = User.objects.create_user(
            username="officer_satellite",
            password="officerpassword123",
            role="STATION",
            station=self.station_b
        )

        self.client = APIClient()

        # Seed audit logs for Station A
        for i in range(15):
            AuditLog.objects.create(
                actor=self.station_user_a,
                action=f"Station A Action #{i}",
                category=AuditEventCategory.FIR if i % 2 == 0 else AuditEventCategory.PATROL,
                event_type=AuditEventType.FIR_CREATED if i % 2 == 0 else AuditEventType.PATROL_DISPATCHED,
                description=f"Description for event {i} at Station A",
                resource_type="FIR" if i % 2 == 0 else "PatrolAssignment",
                resource_id=f"RES-A-{i}",
                station=self.station_a,
                status="SUCCESS"
            )

        # Seed audit logs for Station B
        for j in range(10):
            AuditLog.objects.create(
                actor=self.station_user_b,
                action=f"Station B Action #{j}",
                category=AuditEventCategory.INCIDENT,
                event_type=AuditEventType.INCIDENT_CREATED,
                description=f"Description for event {j} at Station B",
                resource_type="Incident",
                resource_id=f"RES-B-{j}",
                station=self.station_b,
                status="SUCCESS"
            )

    def test_04_pagination_and_newest_first_ordering(self):
        """6: Verify pagination returns correct page slices and newest first ordering."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/intelligence/audit-logs/?page=1&page_size=10')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 25)
        self.assertEqual(len(response.data['results']), 10)
        self.assertEqual(response.data['total_pages'], 3)
        self.assertEqual(response.data['current_page'], 1)

        # Check newest first order
        timestamps = [r['timestamp'] for r in response.data['results']]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))

    def test_05_category_and_event_type_filtering(self):
        """7: Verify filtering by category and event_type."""
        self.client.force_authenticate(user=self.admin)

        # Filter by category FIR
        res = self.client.get('/api/intelligence/audit-logs/?category=FIR')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for log in res.data['results']:
            self.assertEqual(log['category'], AuditEventCategory.FIR)

        # Filter by event_type INCIDENT_CREATED
        res2 = self.client.get('/api/intelligence/audit-logs/?event_type=INCIDENT_CREATED')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['count'], 10)
        for log in res2.data['results']:
            self.assertEqual(log['event_type'], AuditEventType.INCIDENT_CREATED)

    def test_06_date_and_search_filtering(self):
        """8: Verify filtering by date range and search term."""
        self.client.force_authenticate(user=self.admin)

        today_str = timezone.now().strftime('%Y-%m-%d')
        res = self.client.get(f'/api/intelligence/audit-logs/?start_date={today_str}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 25)

        # Search for specific resource
        res_search = self.client.get('/api/intelligence/audit-logs/?search=RES-A-3')
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res_search.data['count'], 1)
        self.assertEqual(res_search.data['results'][0]['resource_id'], 'RES-A-3')

    def test_07_admin_citywide_access(self):
        """9: Admin can see all 25 logs across all stations."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/intelligence/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 25)

        # Admin can also filter by specific station
        res_stn_a = self.client.get(f'/api/intelligence/audit-logs/?station_id={self.station_a.id}')
        self.assertEqual(res_stn_a.status_code, status.HTTP_200_OK)
        self.assertEqual(res_stn_a.data['count'], 15)

    def test_08_station_isolation_and_cross_station_access_blocking(self):
        """10, 11: Station user can only see their station's events, even if trying to tamper."""
        # Authenticate as Station A user
        self.client.force_authenticate(user=self.station_user_a)
        response = self.client.get('/api/intelligence/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 15)

        # Confirm all returned logs belong to Station A
        for log in response.data['results']:
            self.assertEqual(log['station']['id'], self.station_a.id)

        # Attempt to tamper by requesting station_id of Station B
        tamper_res = self.client.get(f'/api/intelligence/audit-logs/?station_id={self.station_b.id}')
        self.assertEqual(tamper_res.status_code, status.HTTP_200_OK)
        # Must still strictly return Station A's logs (15), NOT Station B's
        self.assertEqual(tamper_res.data['count'], 15)
        for log in tamper_res.data['results']:
            self.assertEqual(log['station']['id'], self.station_a.id)

    def test_09_audit_summary_metrics(self):
        """Verify GET /api/intelligence/audit-summary/ calculates correct metrics."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/intelligence/audit-summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_events'], 25)
        self.assertIn('events_today', response.data)
        self.assertIn('events_last_24h', response.data)
        self.assertIn('by_category', response.data)
        self.assertIn('most_active_users', response.data)
        self.assertIn('most_common_actions', response.data)

        # Station user summary should only aggregate their station
        self.client.force_authenticate(user=self.station_user_a)
        stn_response = self.client.get('/api/intelligence/audit-summary/')
        self.assertEqual(stn_response.status_code, status.HTTP_200_OK)
        self.assertEqual(stn_response.data['total_events'], 15)


class OperationalHookIntegrationTests(TestCase):
    def setUp(self):
        self.station = PoliceStation.objects.create(
            station_code="STN-NAV",
            name="Navrangpura Station",
            address="Navrangpura"
        )
        self.station_officer = User.objects.create_user(
            username="inspector_gadhavi",
            password="password123",
            role="STATION",
            station=self.station
        )
        self.patrol_officer = User.objects.create_user(
            username="patrol_rathod",
            password="password123",
            role="PATROL_OFFICER",
            station=self.station
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.station_officer)

    def test_10_fir_creation_generates_audit_event(self):
        """Verify creating an FIR automatically emits an audit record."""
        fir_data = {
            'fir_number': 'FIR-AUDIT-2026-99',
            'description': 'Commercial burglary investigation',
            'location_input': {'type': 'Point', 'coordinates': [72.5714, 23.0225]},
        }
        res = self.client.post('/api/crimes/fir/', fir_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Verify audit record was created
        audit_entry = AuditLog.objects.filter(event_type=AuditEventType.FIR_CREATED, resource_id='FIR-AUDIT-2026-99').first()
        self.assertIsNotNone(audit_entry)
        self.assertEqual(audit_entry.actor, self.station_officer)
        self.assertEqual(audit_entry.station, self.station)
        self.assertEqual(audit_entry.resource_type, "FIR")

    def test_11_incident_creation_and_status_update_generates_audit_events(self):
        """Verify creating and patching an incident emits INCIDENT_CREATED and INCIDENT_STATUS_CHANGED."""
        inc_data = {
            'title': 'Night Patrol Alarm Trigger',
            'description': 'Sensor trip near warehouse',
            'location_input': {'type': 'Point', 'coordinates': [72.5714, 23.0225]},
            'date_occurred': timezone.now().isoformat(),
            'severity': 'HIGH',
        }
        res = self.client.post('/api/crimes/incidents/', inc_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        incident_id = str(res.data['id'])

        # Verify INCIDENT_CREATED
        created_audit = AuditLog.objects.filter(event_type=AuditEventType.INCIDENT_CREATED, resource_id=incident_id).first()
        self.assertIsNotNone(created_audit)

        # Update Incident status
        res_patch = self.client.patch(f'/api/crimes/incidents/{incident_id}/', {'status': 'RESOLVED'}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)

        # Verify INCIDENT_STATUS_CHANGED
        status_audit = AuditLog.objects.filter(event_type=AuditEventType.INCIDENT_STATUS_CHANGED, resource_id=incident_id).first()
        self.assertIsNotNone(status_audit)
        self.assertIn("RESOLVED", status_audit.action)

    def test_12_patrol_dispatch_and_status_transitions_generate_audit_events(self):
        """Verify dispatching and acknowledging patrol emits PATROL_DISPATCHED and PATROL_ACKNOWLEDGED."""
        inc = Incident.objects.create(
            title="Patrol Target Scene",
            description="Active alarm",
            location=Point(72.5714, 23.0225),
            date_occurred=timezone.now(),
            station=self.station
        )
        dispatch_data = {
            'officer': self.patrol_officer.id,
            'zone_name': 'Navrangpura Sector 1',
            'priority': 'HIGH',
            'instructions': 'Immediate presence required',
            'destination': {'type': 'Point', 'coordinates': [72.5714, 23.0225]},
            'incident': inc.id,
        }
        res = self.client.post('/api/patrol/assignments/', dispatch_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        assignment_id = str(res.data['id'])

        # Verify PATROL_DISPATCHED audit record
        dispatch_audit = AuditLog.objects.filter(event_type=AuditEventType.PATROL_DISPATCHED, resource_id=assignment_id).first()
        self.assertIsNotNone(dispatch_audit)

        # Officer acknowledges assignment
        self.client.force_authenticate(user=self.patrol_officer)
        patch_res = self.client.patch(f'/api/patrol/assignments/{assignment_id}/', {'status': 'ACKNOWLEDGED'}, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)

        # Verify PATROL_ACKNOWLEDGED audit record
        ack_audit = AuditLog.objects.filter(event_type=AuditEventType.PATROL_ACKNOWLEDGED, resource_id=assignment_id).first()
        self.assertIsNotNone(ack_audit)
        self.assertEqual(ack_audit.actor, self.patrol_officer)
