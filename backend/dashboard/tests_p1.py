from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from users.models import PoliceStation
from crimes.models import Incident
from patrol.models import PatrolAssignment
from dashboard.services import DashboardService

User = get_user_model()

class DashboardP1Tests(TestCase):
    def setUp(self):
        self.station1 = PoliceStation.objects.create(name="Station 1", station_code="S1")
        self.station2 = PoliceStation.objects.create(name="Station 2", station_code="S2")
        
        self.admin = User.objects.create_user(username="admin", password="p", role="ADMIN")
        self.station_user = User.objects.create_user(username="st1", password="p", role="STATION", station=self.station1)
        self.patrol_user = User.objects.create_user(username="p1", password="p", role="PATROL_OFFICER", station=self.station1)
        self.patrol_user2 = User.objects.create_user(username="p2", password="p", role="PATROL", station=self.station1)

        # Create Incidents
        self.inc1 = Incident.objects.create(title="T1", description="D1", location=Point(1,1), date_occurred="2024-01-01T00:00:00Z", severity="CRITICAL", status="OPEN", station=self.station1)
        self.inc2 = Incident.objects.create(title="T2", description="D2", location=Point(1,1), date_occurred="2024-01-01T00:00:00Z", severity="HIGH", status="OPEN", station=self.station1)
        self.inc3 = Incident.objects.create(title="T3", description="D3", location=Point(1,1), date_occurred="2024-01-01T00:00:00Z", severity="CRITICAL", status="RESOLVED", station=self.station2)

        # Create Assignments
        self.assign1 = PatrolAssignment.objects.create(officer=self.patrol_user, station=self.station1, incident=self.inc1, status="EN_ROUTE")
        # Same officer multiple assignments shouldn't count multiple times in busy calculation
        self.assign2 = PatrolAssignment.objects.create(officer=self.patrol_user, station=self.station1, incident=self.inc1, status="ARRIVED")
        self.assign3 = PatrolAssignment.objects.create(officer=self.patrol_user2, station=self.station1, incident=self.inc2, status="COMPLETED")

    def test_workload_aggregation(self):
        workload = DashboardService.get_workload(self.admin)
        
        # Admin sees all stations
        self.assertEqual(len(workload), 2)
        
        s1_data = next(w for w in workload if w['station_id'] == self.station1.id)
        # Station 1 has 2 open incidents
        self.assertEqual(s1_data['open_incidents'], 2)
        
        # inc1 has active assignments (assign1, assign2), inc2 has none (assign3 is completed)
        self.assertEqual(s1_data['incidents_with_active_patrol'], 1)
        self.assertEqual(s1_data['unassigned_open_incidents'], 1)
        
        # Total patrols = 2, Busy = 1 (p1 has active assignments, p2 only has completed)
        self.assertEqual(s1_data['busy_patrol_officers'], 1)
        self.assertEqual(s1_data['available_patrol_officers'], 1)
        
        # Active assignments (assign1, assign2)
        self.assertEqual(s1_data['active_assignments'], 2)
        # Completed assignments (assign3)
        self.assertEqual(s1_data['completed_assignments'], 1)

    def test_distribution_aggregation(self):
        dist = DashboardService.get_distribution(self.admin)
        # Should return all severities
        self.assertEqual(len(dist), 4)
        
        critical = next(d for d in dist if d['severity'] == 'CRITICAL')
        self.assertEqual(critical['count'], 2) # inc1, inc3
        
        high = next(d for d in dist if d['severity'] == 'HIGH')
        self.assertEqual(high['count'], 1) # inc2
        
        low = next(d for d in dist if d['severity'] == 'LOW')
        self.assertEqual(low['count'], 0)

    def test_rbac_isolation(self):
        # Station should only see their own station in workload
        st_workload = DashboardService.get_workload(self.station_user)
        self.assertEqual(len(st_workload), 1)
        self.assertEqual(st_workload[0]['station_id'], self.station1.id)

        # Station should only see their own incidents in distribution
        st_dist = DashboardService.get_distribution(self.station_user)
        critical = next(d for d in st_dist if d['severity'] == 'CRITICAL')
        self.assertEqual(critical['count'], 1) # Only inc1, not inc3

        # Patrol should get empty fallback or 403 (handled in views)
        self.assertEqual(DashboardService.get_workload(self.patrol_user), [])
        self.assertEqual(DashboardService.get_distribution(self.patrol_user), [])
