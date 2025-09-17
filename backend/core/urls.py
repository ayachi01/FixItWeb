from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LocationViewSet, StudentRegistrationViewSet, UserViewSet, TicketViewSet, GuestReportViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'guest_reports', GuestReportViewSet, basename='guest_report')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'student', StudentRegistrationViewSet, basename='student')  # 🔹 Added
router.register(r'locations', LocationViewSet, basename='location')

urlpatterns = [
    path('', include(router.urls)),
    
]