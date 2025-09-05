from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.TicketListView.as_view(), name='ticket_list'),
    path('new/', views.TicketCreateView.as_view(), name='ticket_new'),
    path('ticket/<int:pk>/', views.TicketDetailView.as_view(), name='ticket_detail'),
    path('ticket/<int:pk>/update/', views.TicketUpdateView.as_view(), name='ticket_update'),
    path('ticket/<int:pk>/accept/', views.TicketAcceptView.as_view(), name='ticket_accept'),
    path('ticket/<int:pk>/resolve/', views.TicketResolveView.as_view(), name='ticket_resolve'),
    path('ticket/<int:pk>/feedback/', views.TicketFeedbackView.as_view(), name='ticket_feedback'),
    path('notifications/', views.NotificationListView.as_view(), name='notification_list'),
    path('buildings/', views.BuildingListView.as_view(), name='building_list'),
    path('buildings/new/', views.BuildingCreateView.as_view(), name='building_create'),
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin_dashboard'),
    path('faculty/dashboard/', views.FacultyDashboardView.as_view(), name='faculty_dashboard'),
    path('public/tickets/', views.PublicTicketListView.as_view(), name='public_ticket_list'),
    path('public/ticket/new/', views.PublicTicketCreateView.as_view(), name='public_ticket_new'),
    path('register/', views.register, name='register'),
    # API routes
    path('api/tickets/', views.APITicketListCreateView.as_view(), name='api_ticket_list_create'),
    path('api/tickets/<int:pk>/', views.APITicketDetailView.as_view(), name='api_ticket_detail'),
    path('api/notifications/', views.APINotificationListView.as_view(), name='api_notification_list'),
    path('api/users/', views.APIUserListView.as_view(), name='api_user_list'),
    path('api/register/', views.APIRegisterView.as_view(), name='api_register'),
    path('api/buildings/', views.APIBuildingListCreateView.as_view(), name='api_building_list_create'),
    path('api/chatlogs/', views.APIChatLogListView.as_view(), name='api_chatlog_list'),
]