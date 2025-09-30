# fixit/celery.py
import os
from celery import Celery

# -------------------------------------------------------------------
# Set default Django settings module for 'celery' program
# -------------------------------------------------------------------
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fixit.settings')

# -------------------------------------------------------------------
# Create Celery app instance
# -------------------------------------------------------------------
app = Celery('fixit')

# -------------------------------------------------------------------
# Configure Celery using Django settings with 'CELERY_' namespace
# -------------------------------------------------------------------
app.config_from_object('django.conf:settings', namespace='CELERY')

# -------------------------------------------------------------------
# Auto-discover tasks.py in all installed apps
# -------------------------------------------------------------------
app.autodiscover_tasks()

# -------------------------------------------------------------------
# Optional: Debug / Info logging on worker start
# -------------------------------------------------------------------
@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
