from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async

from config.asgi import application
from users.models import PoliceStation
from crimes.models import Incident
from patrol.models import PatrolAssignment, PatrolLocation

User = get_user_model()


class RealtimeMonitoringWebSocketTests(TransactionTestCase):
    """
    Focused verification tests for WebSocket real-time monitoring,
    JWT authentication, station isolation, and event broadcasting.
    """

    def setUp(self):
        self.station_a = PoliceStation.objects.create(
            name="Navrangpura Precinct",
            station_code="ST-NAV-01",
            address="Navrangpura, Ahmedabad",
            location=Point(72.565, 23.033),
        )
        self.station_b = PoliceStation.objects.create(
            name="Vastrapur Precinct",
            station_code="ST-VAS-02",
            address="Vastrapur, Ahmedabad",
            location=Point(72.520, 23.038),
        )

        self.admin = User.objects.create_user(
            username="admin_realtime",
            password="Password123!",
            role="ADMIN",
        )
        self.user_station_a = User.objects.create_user(
            username="station_a_user",
            password="Password123!",
            role="STATION",
            station=self.station_a,
        )
        self.user_station_b = User.objects.create_user(
            username="station_b_user",
            password="Password123!",
            role="STATION",
            station=self.station_b,
        )
        self.patrol_officer = User.objects.create_user(
            username="officer_kashyap",
            password="Password123!",
            role="PATROL_OFFICER",
            badge_number="PO-991",
            station=self.station_a,
        )

    def tearDown(self):
        from django.db import connections
        connections.close_all()
        super().tearDown()


    def get_jwt(self, user):
        return str(RefreshToken.for_user(user).access_token)


    @database_sync_to_async
    def create_incident(self, **kwargs):
        defaults = {
            "title": "Incident",
            "description": "Incident description",
            "severity": "MEDIUM",
            "status": "OPEN",
            "date_occurred": timezone.now(),
        }
        defaults.update(kwargs)
        return Incident.objects.create(**defaults)

    @database_sync_to_async
    def create_assignment(self, **kwargs):
        defaults = {
            "officer": self.patrol_officer,
            "station": self.station_a,
            "zone_name": "Sector 1",
            "status": "EN_ROUTE",
            "priority": "HIGH",
            "destination": Point(72.570, 23.040),
        }
        defaults.update(kwargs)
        return PatrolAssignment.objects.create(**defaults)

    @database_sync_to_async
    def create_location(self, assignment, lat, lng):
        return PatrolLocation.objects.create(
            assignment=assignment,
            location=Point(lng, lat),
        )

    async def test_authenticated_admin_websocket_connection(self):
        token = self.get_jwt(self.admin)
        communicator = WebsocketCommunicator(application, f"/ws/monitoring/?token={token}")
        connected, _ = await communicator.connect(timeout=10)
        self.assertTrue(connected, "Admin WebSocket connection should succeed with valid JWT")

        # Initial connection event
        msg = await communicator.receive_json_from(timeout=5)
        self.assertEqual(msg.get("type"), "connection_established")
        self.assertEqual(msg.get("user", {}).get("username"), "admin_realtime")
        self.assertEqual(msg.get("status"), "CONNECTED")

        await communicator.disconnect()

    async def test_unauthenticated_connection_rejected(self):
        communicator = WebsocketCommunicator(application, "/ws/monitoring/")
        connected, code = await communicator.connect(timeout=10)
        self.assertFalse(connected, "WebSocket connection with missing token must be rejected")
        self.assertIn(code, [4001, 4003, None])

    async def test_invalid_token_rejected(self):
        communicator = WebsocketCommunicator(application, "/ws/monitoring/?token=invalid_garbage_token")
        connected, code = await communicator.connect(timeout=10)
        self.assertFalse(connected, "WebSocket connection with invalid token must be rejected")
        self.assertIn(code, [4001, 4003, None])

    async def test_station_isolation_websocket(self):
        token_a = self.get_jwt(self.user_station_a)
        token_b = self.get_jwt(self.user_station_b)

        comm_a = WebsocketCommunicator(application, f"/ws/monitoring/?token={token_a}")
        comm_b = WebsocketCommunicator(application, f"/ws/monitoring/?token={token_b}")

        conn_a, _ = await comm_a.connect(timeout=10)
        conn_b, _ = await comm_b.connect(timeout=10)
        self.assertTrue(conn_a)
        self.assertTrue(conn_b)

        # Discard welcome message
        await comm_a.receive_json_from(timeout=2)
        await comm_b.receive_json_from(timeout=2)

        # Create Incident strictly belonging to Station A
        await self.create_incident(
            title="ATM Tampering Navrangpura",
            severity="MEDIUM",
            status="OPEN",
            station=self.station_a,
            location=Point(72.566, 23.034),
        )

        # Station A must receive the incident event
        msg_a = await comm_a.receive_json_from(timeout=3)
        self.assertEqual(msg_a.get("type"), "incident_created")
        self.assertEqual(msg_a.get("incident", {}).get("title"), "ATM Tampering Navrangpura")
        self.assertEqual(msg_a.get("incident", {}).get("station_id"), self.station_a.id)

        # Station B must NOT receive this event (isolation)
        is_empty_b = await comm_b.receive_nothing(timeout=0.5)
        self.assertTrue(is_empty_b, "Station B must not receive Station A incident events")

        await comm_a.disconnect()
        await comm_b.disconnect()

    async def test_critical_alert_broadcast(self):
        token = self.get_jwt(self.admin)
        communicator = WebsocketCommunicator(application, f"/ws/monitoring/?token={token}")
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.receive_json_from(timeout=2)  # Discard welcome

        # Create CRITICAL incident
        inc = await self.create_incident(
            title="Armed Bank Heist",
            severity="CRITICAL",
            status="OPEN",
            station=self.station_a,
            location=Point(72.568, 23.035),
        )

        # Admin should receive incident_created and critical_alert
        msgs = []
        for _ in range(2):
            try:
                m = await communicator.receive_json_from(timeout=3)
                msgs.append(m)
            except Exception:
                break

        msg_types = [m.get("type") for m in msgs]
        self.assertIn("incident_created", msg_types)
        self.assertIn("critical_alert", msg_types)

        alert_msg = next((m for m in msgs if m.get("type") == "critical_alert"), None)
        self.assertIsNotNone(alert_msg)
        self.assertEqual(alert_msg.get("severity"), "CRITICAL")
        self.assertEqual(alert_msg.get("incident_id"), inc.id)

        await communicator.disconnect()

    async def test_patrol_gps_update_broadcast(self):
        token = self.get_jwt(self.admin)
        communicator = WebsocketCommunicator(application, f"/ws/monitoring/?token={token}")
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.receive_json_from(timeout=2)  # Discard welcome

        assignment = await self.create_assignment()

        # Record GPS ping
        await self.create_location(assignment, lat=23.039, lng=72.569)

        gps_msg = await communicator.receive_json_from(timeout=3)
        self.assertEqual(gps_msg.get("type"), "patrol_location_updated")
        self.assertEqual(gps_msg.get("assignment_id"), assignment.id)
        self.assertEqual(gps_msg.get("officer_id"), self.patrol_officer.id)
        self.assertAlmostEqual(gps_msg.get("latitude"), 23.039, places=3)
        self.assertAlmostEqual(gps_msg.get("longitude"), 72.569, places=3)

        await communicator.disconnect()
