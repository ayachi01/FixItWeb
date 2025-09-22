# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    LocationViewSet,
    StudentRegistrationViewSet,
    UserViewSet,
    TicketViewSet,
    GuestReportViewSet,
    NotificationViewSet,
    UserProfileView,
    EmailLoginView,
    CookieTokenRefreshView,   # ✅ custom refresh
    LogoutView,               # ✅ add this import
)

# 🔹 Register ViewSets with DRF router
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'guest_reports', GuestReportViewSet, basename='guest_report')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'student', StudentRegistrationViewSet, basename='student')
router.register(r'locations', LocationViewSet, basename='location')

# 🔹 URL patterns
urlpatterns = [
    path('', include(router.urls)),

    # ✅ Authentication (JWT)
    path("token/", EmailLoginView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),

    # ✅ User profile
    path("profile/", UserProfileView.as_view(), name="user_profile"),

    # ✅ Logout
    path("logout/", LogoutView.as_view(), name="logout"),
]
