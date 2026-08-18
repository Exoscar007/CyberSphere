from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.utils import timezone
from datetime import timedelta
import random

from patrol.models import PatrolAssignment, PatrolLocation


class Command(BaseCommand):
    help = "Seed realistic GPS location pings and breadcrumb trails for active patrol assignments (Development & Verification tool)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--assignment-id',
            type=int,
            help='Target specific PatrolAssignment ID to seed GPS trail for'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=6,
            help='Number of GPS breadcrumb points to generate (default: 6)'
        )
        parser.add_argument(
            '--stale',
            action='store_true',
            help='Generate stale GPS points older than 10 minutes to test stale status detection'
        )
        parser.add_argument(
            '--all-active',
            action='store_true',
            help='Seed GPS points for all active patrol assignments'
        )

    def handle(self, *args, **options):
        assignment_id = options.get('assignment_id')
        count = options.get('count', 6)
        is_stale = options.get('stale', False)
        all_active = options.get('all_active', False)

        active_statuses = ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED']

        if assignment_id:
            assignments = PatrolAssignment.objects.filter(id=assignment_id)
            if not assignments.exists():
                self.stderr.write(self.style.ERROR(f"PatrolAssignment #{assignment_id} not found."))
                return
        elif all_active:
            assignments = PatrolAssignment.objects.filter(status__in=active_statuses)
        else:
            assignments = PatrolAssignment.objects.filter(status__in=active_statuses)[:3]

        if not assignments.exists():
            self.stdout.write(self.style.WARNING("No active patrol assignments found to seed GPS."))
            return

        total_created = 0
        base_time = timezone.now() - (timedelta(minutes=15) if is_stale else timedelta(minutes=count * 2))

        for assignment in assignments:
            # Base coordinate from destination, or Ahmedabad center (23.0225, 72.5714)
            if assignment.destination:
                dest_lng = assignment.destination.x
                dest_lat = assignment.destination.y
            else:
                dest_lat, dest_lng = 23.0225, 72.5714

            # Generate progressive breadcrumb path moving towards/around the sector
            cur_lat = dest_lat - (count * 0.002) + (random.random() * 0.001)
            cur_lng = dest_lng - (count * 0.002) + (random.random() * 0.001)

            for i in range(count):
                cur_lat += 0.0015 + (random.random() - 0.5) * 0.0005
                cur_lng += 0.0015 + (random.random() - 0.5) * 0.0005
                ping_time = base_time + timedelta(minutes=i * 2)

                point = Point(cur_lng, cur_lat, srid=4326)
                ping = PatrolLocation.objects.create(
                    assignment=assignment,
                    location=point,
                )
                # Override timestamp if needed for backdated testing
                if is_stale or i < count - 1:
                    PatrolLocation.objects.filter(id=ping.id).update(timestamp=ping_time)

                total_created += 1

            latest = assignment.locations.order_by('-timestamp').first()
            status_label = "STALE (>10m ago)" if is_stale else "LIVE (recent)"
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Assignment #{assignment.id} ({assignment.officer.username}): Seeded {count} GPS pings [{status_label}]. Latest: {latest.location.y:.5f}, {latest.location.x:.5f}"
                )
            )

        self.stdout.write(self.style.SUCCESS(f"\nDone! Seeded {total_created} total GPS points."))
