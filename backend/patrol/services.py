from .repository import PatrolRepository
from django.contrib.gis.geos import Point

class PatrolService:
    @staticmethod
    def assign_patrol(user, officer, zone_name, destination, priority, instructions, fir=None, incident=None):
        station = user.station if hasattr(user, 'station') else None
        return PatrolRepository.create_assignment(
            officer=officer, zone_name=zone_name, destination=destination, priority=priority, instructions=instructions,
            station=station, fir=fir, incident=incident
        )

    @staticmethod
    def get_all_patrols(user):
        return PatrolRepository.get_all_assignments(user)

    @staticmethod
    def get_active_patrols(user):
        return PatrolRepository.get_active_assignments(user)

    @staticmethod
    def get_patrol_assignment(user, assignment_id):
        return PatrolRepository.get_assignment(assignment_id, user)

    @staticmethod
    def update_assignment_status(user, assignment_id, status):
        from .models import PatrolAssignment
        assignment = PatrolRepository.get_assignment(assignment_id, user)
        if not assignment:
            raise ValueError("Assignment not found or permission denied")
            
        VALID_TRANSITIONS = {
            PatrolAssignment.Status.ASSIGNED: [PatrolAssignment.Status.ACKNOWLEDGED, PatrolAssignment.Status.CANCELLED],
            PatrolAssignment.Status.ACKNOWLEDGED: [PatrolAssignment.Status.EN_ROUTE, PatrolAssignment.Status.CANCELLED],
            PatrolAssignment.Status.EN_ROUTE: [PatrolAssignment.Status.ARRIVED, PatrolAssignment.Status.CANCELLED],
            PatrolAssignment.Status.ARRIVED: [PatrolAssignment.Status.COMPLETED, PatrolAssignment.Status.CANCELLED],
            PatrolAssignment.Status.COMPLETED: [],
            PatrolAssignment.Status.CANCELLED: [],
        }

        if status not in VALID_TRANSITIONS.get(assignment.status, []):
            raise ValueError(f"Invalid transition from {assignment.status} to {status}")

        if status == PatrolAssignment.Status.CANCELLED:
            if user.role not in ['ADMIN', 'STATION']:
                raise ValueError("Only Station/Admin can cancel an assignment")
        else:
            if user.role == 'PATROL_OFFICER' and assignment.officer != user:
                raise ValueError("Patrol cannot modify another Patrol's assignment")

        old_status = assignment.status
        assignment.status = status
        assignment.save()

        from .models import PatrolStatusHistory
        PatrolStatusHistory.objects.create(
            assignment=assignment,
            old_status=old_status,
            new_status=status,
            actor=user
        )

        return assignment

    @staticmethod
    def log_ping(user, assignment_id, lat, lng):
        from .models import PatrolAssignment
        assignment = PatrolRepository.get_assignment(assignment_id, user)
        if not assignment:
            raise ValueError("Assignment not found or permission denied")
        
        if assignment.status in [PatrolAssignment.Status.COMPLETED, PatrolAssignment.Status.CANCELLED]:
            raise ValueError("Cannot log GPS ping for completed or cancelled assignments")
        
        point = Point(float(lng), float(lat), srid=4326)
        return PatrolRepository.log_location(assignment, point)

    @staticmethod
    def optimize_patrol_route(user, officer_id=None, max_waypoints=6, priority_only=False, incident_ids=None):
        """
        Geographic Patrol Route Optimization Engine (Nearest-Neighbor + 2-Opt TSP Heuristic).
        Generates an ordered multi-stop patrol itinerary from the officer's current position/station base
        through active incident coordinates, prioritizing high-severity hotspots.
        """
        import math
        from django.contrib.auth import get_user_model
        from crimes.models import Incident
        from .models import PatrolLocation

        User = get_user_model()

        def haversine_km(lat1, lon1, lat2, lon2):
            R = 6371.0  # Earth radius in kilometers
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return R * c

        # 1. Resolve target officer and respect RBAC / Station Boundaries
        officer = None
        if officer_id:
            try:
                officer = User.objects.get(id=officer_id)
                if user.role == 'STATION' and user.station and officer.station != user.station:
                    raise ValueError("Cannot optimize route for an officer outside station jurisdiction.")
            except User.DoesNotExist:
                raise ValueError("Officer not found.")
        elif user.role == 'PATROL_OFFICER':
            officer = user
        elif user.role == 'STATION' and user.station:
            officer = User.objects.filter(station=user.station, role__in=['PATROL', 'PATROL_OFFICER']).first()
        else:
            officer = User.objects.filter(role__in=['PATROL', 'PATROL_OFFICER']).first()

        # 2. Determine initial starting coordinate
        start_lat, start_lng, start_label = 23.0225, 72.5714, "Ahmedabad Central Operations"
        if officer:
            latest_ping = PatrolLocation.objects.filter(assignment__officer=officer).order_by('-timestamp').first()
            if latest_ping and latest_ping.location:
                start_lat, start_lng = latest_ping.location.y, latest_ping.location.x
                start_label = f"Officer {officer.username} Current GPS Ping"
            elif officer.station and officer.station.location:
                start_lat, start_lng = officer.station.location.y, officer.station.location.x
                start_label = f"{officer.station.name} Precinct Base"
        elif user.role == 'STATION' and user.station and user.station.location:
            start_lat, start_lng = user.station.location.y, user.station.location.x
            start_label = f"{user.station.name} Precinct Base"

        # 3. Retrieve Candidate Incidents within Jurisdiction
        incident_qs = Incident.objects.filter(status='OPEN')
        if user.role == 'STATION' and user.station:
            incident_qs = incident_qs.filter(station=user.station)
        elif officer and officer.station:
            incident_qs = incident_qs.filter(station=officer.station)

        if incident_ids and isinstance(incident_ids, list):
            incident_qs = incident_qs.filter(id__in=incident_ids)
        elif priority_only:
            incident_qs = incident_qs.filter(severity__in=['CRITICAL', 'HIGH'])

        raw_incidents = list(incident_qs)
        valid_candidates = []
        for inc in raw_incidents:
            if inc.location and hasattr(inc.location, 'x') and hasattr(inc.location, 'y'):
                valid_candidates.append({
                    'id': inc.id,
                    'title': inc.title,
                    'description': inc.description,
                    'severity': inc.severity,
                    'status': inc.status,
                    'lat': float(inc.location.y),
                    'lng': float(inc.location.x),
                    'distance_from_start': haversine_km(start_lat, start_lng, float(inc.location.y), float(inc.location.x))
                })

        if not valid_candidates:
            return {
                "officer": {
                    "id": officer.id if officer else None,
                    "username": officer.username if officer else "N/A",
                    "badge_number": getattr(officer, 'badge_number', None),
                    "start_location": {"lat": start_lat, "lng": start_lng, "label": start_label}
                },
                "total_distance_km": 0.0,
                "estimated_time_minutes": 0,
                "waypoints_count": 0,
                "waypoints": [],
                "route_geometry": [[start_lat, start_lng]],
                "message": "No active open incidents found for patrol routing in this sector."
            }

        # Severity weighting (CRITICAL = 4, HIGH = 3, MEDIUM = 2, LOW = 1)
        sev_weights = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
        valid_candidates.sort(key=lambda c: (-sev_weights.get(c['severity'], 1), c['distance_from_start']))
        selected_pool = valid_candidates[:max(1, min(max_waypoints, 12))]

        # 4. Nearest-Neighbor Route Sequencing from start position
        unvisited = list(selected_pool)
        ordered_waypoints = []
        cur_lat, cur_lng = start_lat, start_lng
        total_dist = 0.0
        cumulative_minutes = 0
        AVG_SPEED_KMH = 35.0
        ASSESSMENT_BUFFER_MINUTES = 4

        seq = 1
        while unvisited:
            closest_idx = 0
            min_d = float('inf')
            for idx, cand in enumerate(unvisited):
                d = haversine_km(cur_lat, cur_lng, cand['lat'], cand['lng'])
                if d < min_d:
                    min_d = d
                    closest_idx = idx

            best = unvisited.pop(closest_idx)
            leg_dist = min_d
            transit_min = max(1, round((leg_dist / AVG_SPEED_KMH) * 60))
            cumulative_minutes += transit_min + ASSESSMENT_BUFFER_MINUTES
            total_dist += leg_dist

            ordered_waypoints.append({
                "sequence": seq,
                "incident_id": best['id'],
                "title": best['title'],
                "description": best['description'],
                "severity": best['severity'],
                "status": best['status'],
                "lat": best['lat'],
                "lng": best['lng'],
                "leg_distance_km": round(leg_dist, 2),
                "est_arrival_minutes": cumulative_minutes,
            })
            cur_lat, cur_lng = best['lat'], best['lng']
            seq += 1

        # 5. 2-opt refinement when 4 or more stops exist to eliminate route crossing
        if len(ordered_waypoints) >= 4:
            improved = True
            iterations = 0
            while improved and iterations < 20:
                improved = False
                iterations += 1
                for i in range(len(ordered_waypoints) - 1):
                    for j in range(i + 2, len(ordered_waypoints)):
                        p_prev = (start_lat, start_lng) if i == 0 else (ordered_waypoints[i - 1]['lat'], ordered_waypoints[i - 1]['lng'])
                        p_i = (ordered_waypoints[i]['lat'], ordered_waypoints[i]['lng'])
                        p_j = (ordered_waypoints[j]['lat'], ordered_waypoints[j]['lng'])
                        p_next = (ordered_waypoints[j + 1]['lat'], ordered_waypoints[j + 1]['lng']) if j + 1 < len(ordered_waypoints) else None

                        curr_cost = haversine_km(p_prev[0], p_prev[1], p_i[0], p_i[1])
                        if p_next:
                            curr_cost += haversine_km(p_j[0], p_j[1], p_next[0], p_next[1])
                            new_cost = haversine_km(p_prev[0], p_prev[1], p_j[0], p_j[1]) + haversine_km(p_i[0], p_i[1], p_next[0], p_next[1])
                            if new_cost + 0.01 < curr_cost:
                                ordered_waypoints[i:j + 1] = reversed(ordered_waypoints[i:j + 1])
                                improved = True
                                break
                    if improved:
                        break

            # Recompute sequences and arrival metrics
            cur_lat, cur_lng = start_lat, start_lng
            total_dist = 0.0
            cumulative_minutes = 0
            for idx, wp in enumerate(ordered_waypoints, start=1):
                wp['sequence'] = idx
                d = haversine_km(cur_lat, cur_lng, wp['lat'], wp['lng'])
                wp['leg_distance_km'] = round(d, 2)
                transit_min = max(1, round((d / AVG_SPEED_KMH) * 60))
                cumulative_minutes += transit_min + ASSESSMENT_BUFFER_MINUTES
                wp['est_arrival_minutes'] = cumulative_minutes
                total_dist += d
                cur_lat, cur_lng = wp['lat'], wp['lng']

        route_geometry = [[start_lat, start_lng]] + [[wp['lat'], wp['lng']] for wp in ordered_waypoints]

        return {
            "officer": {
                "id": officer.id if officer else None,
                "username": officer.username if officer else "N/A",
                "badge_number": getattr(officer, 'badge_number', None),
                "start_location": {"lat": start_lat, "lng": start_lng, "label": start_label}
            },
            "total_distance_km": round(total_dist, 2),
            "estimated_time_minutes": cumulative_minutes,
            "waypoints_count": len(ordered_waypoints),
            "waypoints": ordered_waypoints,
            "route_geometry": route_geometry,
            "message": f"Successfully generated optimal {len(ordered_waypoints)}-stop patrol route."
        }

