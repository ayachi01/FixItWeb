# from django.shortcuts import render

# Create your views here.
from django.views.generic import ListView, DetailView, CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from .models import Ticket
from django.urls import reverse_lazy
from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from .models import User
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import Notification, Ticket, User
from .serializers import NotificationSerializer, TicketSerializer, UserSerializer
from rest_framework.response import Response
from rest_framework import status
from django.views import View

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2', 'role', 'university_id']

def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)  # Log in user after registration
            return redirect('reports:ticket_list')
    else:
        form = CustomUserCreationForm()
    return render(request, 'registration/register.html', {'form': form})

class TicketListView(ListView):
    model = Ticket
    template_name = 'reports/ticket_list.html'
    context_object_name = 'tickets'

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Ticket.objects.all()
        return Ticket.objects.filter(reporter=self.request.user)

class TicketCreateView(LoginRequiredMixin, CreateView):
    model = Ticket
    template_name = 'reports/ticket_form.html'
    fields = ['description', 'location', 'category', 'urgency', 'photo']
    success_url = reverse_lazy('reports:ticket_list')

    def form_valid(self, form):
        form.instance.reporter = self.request.user
        return super().form_valid(form)

class TicketDetailView(LoginRequiredMixin, DetailView):
    model = Ticket
    template_name = 'reports/ticket_detail.html'
    context_object_name = 'ticket'

class TicketUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Ticket
    template_name = 'reports/ticket_form.html'
    fields = ['description', 'location', 'category', 'urgency', 'photo', 'status', 'assigned_to']
    success_url = reverse_lazy('reports:ticket_list')

    def test_func(self):
        return self.request.user.role in ['admin', 'staff']

# API Views
class APITicketListCreateView(generics.ListCreateAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Ticket.objects.all()
        return Ticket.objects.filter(reporter=self.request.user)

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

class APITicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['admin', 'staff']:
            return Ticket.objects.all()
        return Ticket.objects.filter(reporter=self.request.user)

class APINotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

class APIUserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class APIRegisterView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = []

    def perform_create(self, serializer):
        user = serializer.save()
        user.set_password(self.request.data.get('password'))
        user.save()

class AdminDashboardView(UserPassesTestMixin, View):
    def test_func(self):
        return self.request.user.role == 'admin'
    def get(self, request):
        tickets = Ticket.objects.all()
        users = User.objects.all()
        return render(request, 'reports/admin_dashboard.html', {
            'tickets': tickets,
            'users': users,
        })