from django.urls import path
from .consumers import ChatConsumer

websocket_urlpatterns = [
    path("ws/chat/<str:room_name>/", ChatConsumer.as_asgi()),  # ✅ Chat WebSocket
    path("ws/chat/user/<str:user_id>/", ChatConsumer.as_asgi()),  # ✅ User-specific WebSocket for calls
]
