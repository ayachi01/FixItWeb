from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="llm_home"),
    path("report/", views.report_issue, name="llm_report"),
]
