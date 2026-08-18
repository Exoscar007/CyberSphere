import json
import logging
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token_str):
    """
    Validate SimpleJWT access token and retrieve active user with station relationship.
    """
    if not token_str:
        return None
    try:
        access_token = AccessToken(token_str)
        user_id = access_token.get('user_id')
        if not user_id:
            return None
        User = get_user_model()
        user = User.objects.select_related('station').filter(id=user_id, is_active=True).first()
        return user
    except (InvalidToken, TokenError, Exception) as e:
        logger.warning(f"WebSocket token authentication failed: {e}")
        return None


class MonitoringConsumer(AsyncJsonWebsocketConsumer):
    """
    Real-Time Command Center Monitoring Consumer.
    Authenticates clients via JWT query param, subscribes them to role-permitted channel groups,
    and streams live incident creation/updates, patrol GPS telemetry, and critical alerts.
    """

    async def connect(self):
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]

        # Authenticate user
        user = await get_user_from_token(token)
        if not user:
            logger.info("Rejecting unauthenticated WebSocket connection attempt.")
            await self.close(code=4001)
            return

        self.user = user
        self.groups_joined = []

        # Role-based channel group subscription & station boundary enforcement
        if user.role == 'ADMIN':
            await self.channel_layer.group_add('global_monitoring', self.channel_name)
            self.groups_joined.append('global_monitoring')
        elif user.role == 'STATION' and user.station_id:
            station_group = f"station_{user.station_id}"
            await self.channel_layer.group_add(station_group, self.channel_name)
            self.groups_joined.append(station_group)
        elif user.role in ['PATROL', 'PATROL_OFFICER', 'POLICE_OFFICER']:
            patrol_group = f"patrol_{user.id}"
            await self.channel_layer.group_add(patrol_group, self.channel_name)
            self.groups_joined.append(patrol_group)
            if user.station_id:
                station_group = f"station_{user.station_id}"
                await self.channel_layer.group_add(station_group, self.channel_name)
                self.groups_joined.append(station_group)
        else:
            # Fallback user group
            user_group = f"user_{user.id}"
            await self.channel_layer.group_add(user_group, self.channel_name)
            self.groups_joined.append(user_group)

        await self.accept()

        # Send initial confirmation payload
        await self.send_json({
            "type": "connection_established",
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "station_id": user.station_id,
            },
            "status": "CONNECTED",
            "message": "Subscribed to real-time operations telemetry stream."
        })

    async def disconnect(self, close_code):
        if hasattr(self, 'groups_joined'):
            for group in self.groups_joined:
                await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content):
        """
        Handle incoming client messages (e.g. heartbeat ping).
        """
        msg_type = content.get('type')
        if msg_type == 'ping':
            await self.send_json({"type": "pong", "timestamp": content.get("timestamp")})

    # Group Event Handlers
    async def incident_event(self, event):
        await self.send_json(event.get("data", {}))

    async def patrol_event(self, event):
        await self.send_json(event.get("data", {}))

    async def alert_event(self, event):
        await self.send_json(event.get("data", {}))

    async def risk_event(self, event):
        await self.send_json(event.get("data", {}))
