# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView


from .views import (
    LocationViewSet,
    StudentRegistrationViewSet,
    UserViewSet,
    TicketViewSet,
    GuestReportViewSet,
    NotificationViewSet,
    UserProfileView,
    EmailLoginView,  # ✅ use this, not default
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'guest_reports', GuestReportViewSet, basename='guest_report')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'student', StudentRegistrationViewSet, basename='student')
router.register(r'locations', LocationViewSet, basename='location')

urlpatterns = [
    path('', include(router.urls)),

    # ✅ Custom email-based login
    path("token/", EmailLoginView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Fetch logged-in user profile
    path("profile/", UserProfileView.as_view(), name="user_profile"),
]
