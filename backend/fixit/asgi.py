"""
ASGI config for fixit project.

This exposes the ASGI callable as a module-level variable named ``application``.

It allows both HTTP (Django) and WebSocket connections (via Channels).

For more information:
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import core.routing  # ✅ your WebSocket URL routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fixit.settings")

# Standard Django ASGI application for HTTP
django_asgi_app = get_asgi_application()

# Main ASGI application supporting HTTP + WebSockets
application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,  # HTTP requests
        "websocket": AuthMiddlewareStack(
            URLRouter(core.routing.websocket_urlpatterns)
        ),  # WebSocket connections
    }
)
