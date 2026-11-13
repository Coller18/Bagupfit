from django.contrib.auth import authenticate
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
import mimetypes
from pathlib import Path
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import Availability, Barber, Booking
from .authentication import SupabaseAuthAuthentication
from .permissions import AdminModelPermissions, IsSubAdminOrSuperuser
from .serializers import (
    AdminBookingSerializer,
    AdminBookingReviewSerializer,
    AvailabilitySerializer,
    BarberSerializer,
    CustomerBookingSerializer,
)


class SubAdminLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(
            request,
            username=request.data.get('username', ''),
            password=request.data.get('password', ''),
        )
        if not user or not user.is_active:
            return Response({'detail': 'Invalid username or password.'}, status=status.HTTP_400_BAD_REQUEST)

        has_dashboard_access = user.is_superuser or (
            user.is_staff and user.groups.filter(name='Sub-admin').exists()
        )
        if not has_dashboard_access:
            return Response({'detail': 'This account does not have dashboard access.'}, status=status.HTTP_403_FORBIDDEN)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'username': user.get_username()})


class SubAdminLogoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsSubAdminOrSuperuser]

    def post(self, request):
        request.auth.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BarberListView(generics.ListAPIView):
    queryset = Barber.objects.filter(is_active=True)
    serializer_class = BarberSerializer
    permission_classes = [AllowAny]


class BarberPhotoView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, pk):
        barber = get_object_or_404(Barber, pk=pk)
        if not barber.photo:
            raise Http404
        try:
            image_file = barber.photo.open('rb')
        except (FileNotFoundError, OSError):
            raise Http404
        content_type = mimetypes.guess_type(barber.photo.name)[0] or 'application/octet-stream'
        return FileResponse(image_file, content_type=content_type)


class AdminBarberListCreateView(generics.ListCreateAPIView):
    queryset = Barber.objects.all()
    serializer_class = BarberSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSubAdminOrSuperuser, AdminModelPermissions]


class AdminBarberDetailView(generics.RetrieveUpdateAPIView):
    queryset = Barber.objects.all()
    serializer_class = BarberSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSubAdminOrSuperuser, AdminModelPermissions]


class AdminAvailabilityListCreateView(generics.ListCreateAPIView):
    queryset = Availability.objects.select_related('barber').prefetch_related('bookings').all()
    serializer_class = AvailabilitySerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSubAdminOrSuperuser, AdminModelPermissions]


class PublicAvailabilityListView(generics.ListAPIView):
    serializer_class = AvailabilitySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        today = timezone.localdate()
        current_time = timezone.localtime().time()
        return Availability.objects.select_related('barber').prefetch_related('bookings').filter(
            barber__is_active=True,
        ).filter(
            Q(date__gt=today) | Q(date=today, start_time__gt=current_time),
        ).exclude(
            bookings__status__in=[Booking.Status.PENDING_REVIEW, Booking.Status.CONFIRMED],
        )


class AdminBookingListView(generics.ListAPIView):
    queryset = Booking.objects.select_related('availability__barber').all()
    serializer_class = AdminBookingSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSubAdminOrSuperuser, AdminModelPermissions]


class AdminBookingReviewView(generics.UpdateAPIView):
    queryset = Booking.objects.select_related('availability__barber').all()
    serializer_class = AdminBookingReviewSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSubAdminOrSuperuser, AdminModelPermissions]


class AdminBookingReceiptView(APIView):
    queryset = Booking.objects.all()
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSubAdminOrSuperuser, AdminModelPermissions]

    def get(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk)
        if not booking.payment_receipt:
            return Response({'detail': 'No payment receipt was uploaded.'}, status=status.HTTP_404_NOT_FOUND)
        filename = f'booking-{booking.pk}-receipt{Path(booking.payment_receipt.name).suffix.lower()}'
        response = FileResponse(booking.payment_receipt.open('rb'), as_attachment=True, filename=filename)
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response


class CustomerBookingCreateView(generics.CreateAPIView):
    serializer_class = CustomerBookingSerializer
    authentication_classes = [SupabaseAuthAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        availability_id = serializer.validated_data['availability'].pk
        slot = Availability.objects.select_for_update().get(pk=availability_id)
        if slot.bookings.filter(status__in=[Booking.Status.PENDING_REVIEW, Booking.Status.CONFIRMED]).exists():
            raise ValidationError({'availability': 'This time slot is already booked.'})
        full_name = str(self.request.user.user_metadata.get('full_name') or '').strip()
        if not full_name:
            raise ValidationError({'customer_name': 'Add your full name to your customer profile before booking.'})
        serializer.save(
            availability=slot,
            customer_id=self.request.user.pk,
            customer_name=full_name,
            customer_email=self.request.user.email,
            customer_phone=str(self.request.user.user_metadata.get('phone') or '').strip(),
            status=Booking.Status.PENDING_REVIEW,
        )


class CustomerBookingHistoryView(generics.ListAPIView):
    serializer_class = AdminBookingSerializer
    authentication_classes = [SupabaseAuthAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.select_related('availability__barber').filter(customer_id=self.request.user.pk)
