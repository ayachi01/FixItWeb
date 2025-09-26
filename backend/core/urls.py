# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    LocationViewSet,
    UserViewSet,
    TicketViewSet,
    UserProfileView,          # ✅ returns both profile + features
    EmailLoginView,
    CookieTokenRefreshView,   # ✅ custom refresh
    LogoutView,               # ✅ logout endpoint
)

# 🔹 Register ViewSets with DRF router
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'tickets', TicketViewSet, basename='ticket')
# router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'locations', LocationViewSet, basename='location')

# 🔹 URL patterns
urlpatterns = [
    # ViewSets (users, tickets, locations, etc.)
    path('', include(router.urls)),

    # ✅ Authentication (matches frontend)
    path("auth/login/", EmailLoginView.as_view(), name="login"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),

    # ✅ User profile (merged with features)
    path("auth/profile/", UserProfileView.as_view(), name="user_profile"),
]
