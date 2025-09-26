"""
WSGI config for fixit project.

This file is used for running the project over WSGI (e.g., with Gunicorn or uWSGI).
It only handles traditional HTTP requests.

For WebSockets and async features, see `asgi.py`.
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fixit.settings")

# ✅ WSGI application (HTTP only)
application = get_wsgi_application()
