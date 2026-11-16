from django.contrib.auth import authenticate
import hmac
import os
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

from .models import Availability, Barber, Booking, HaircutWork
from .authentication import SupabaseAuthAuthentication
from .permissions import AdminModelPermissions, IsSubAdminOrSuperuser
from .serializers import (
    AdminBookingSerializer,
    AdminBookingReviewSerializer,
    AvailabilitySerializer,
    BarberSerializer,
    CustomerBookingSerializer,
    HaircutWorkSerializer,
)
from .telegram import (
    answer_callback_query,
    send_new_booking_notification,
    update_booking_message,
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


class PublicHaircutWorkListView(generics.ListAPIView):
    queryset = HaircutWork.objects.filter(is_published=True)
    serializer_class = HaircutWorkSerializer
    permission_classes = [AllowAny]


class PublicFeaturedHaircutWorkListView(generics.ListAPIView):
    queryset = HaircutWork.objects.filter(is_published=True, is_featured=True)
    serializer_class = HaircutWorkSerializer
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


class AdminHaircutWorkListCreateView(generics.ListCreateAPIView):
    queryset = HaircutWork.objects.all()
    serializer_class = HaircutWorkSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSubAdminOrSuperuser, AdminModelPermissions]


class AdminHaircutWorkDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = HaircutWork.objects.all()
    serializer_class = HaircutWorkSerializer
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
        booking = serializer.save(
            availability=slot,
            customer_id=self.request.user.pk,
            customer_name=full_name,
            customer_email=self.request.user.email,
            customer_phone=str(self.request.user.user_metadata.get('phone') or '').strip(),
            status=Booking.Status.PENDING_REVIEW,
        )
        transaction.on_commit(
            lambda booking=booking: send_new_booking_notification(booking),
            robust=True,
        )


class TelegramBookingWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        expected_secret = os.environ.get('TELEGRAM_WEBHOOK_SECRET', '').strip()
        supplied_secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token', '')
        if not expected_secret or not hmac.compare_digest(supplied_secret, expected_secret):
            return Response({'detail': 'Invalid webhook secret.'}, status=status.HTTP_403_FORBIDDEN)

        callback = request.data.get('callback_query') or {}
        callback_id = callback.get('id')
        message = callback.get('message') or {}
        chat_id = str((message.get('chat') or {}).get('id', ''))
        user_id = str((callback.get('from') or {}).get('id', ''))
        allowed_chat_id = os.environ.get('TELEGRAM_CHAT_ID', '').strip()
        if not callback_id or chat_id != allowed_chat_id or user_id != allowed_chat_id:
            return Response({'detail': 'Unauthorized Telegram chat.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            prefix, booking_id, action = str(callback.get('data', '')).split(':')
            if prefix != 'booking' or action not in {'approve', 'reject'}:
                raise ValueError
            booking_id = int(booking_id)
        except (TypeError, ValueError):
            answer_callback_query(callback_id, 'This booking action is invalid.')
            return Response({'ok': True})

        next_status = Booking.Status.CONFIRMED if action == 'approve' else Booking.Status.CANCELLED
        with transaction.atomic():
            booking = Booking.objects.select_for_update().filter(pk=booking_id).first()
            if booking and booking.status == Booking.Status.PENDING_REVIEW:
                booking.status = next_status
                booking.save(update_fields=['status'])
            else:
                booking = None

        if not booking:
            answer_callback_query(callback_id, 'This booking was already reviewed or no longer exists.')
            return Response({'ok': True})

        result_label = 'confirmed' if next_status == Booking.Status.CONFIRMED else 'cancelled'
        answer_callback_query(callback_id, f'Booking {result_label}.')
        update_booking_message(chat_id, message.get('message_id'), booking, result_label)
        return Response({'ok': True})


class CustomerBookingHistoryView(generics.ListAPIView):
    serializer_class = AdminBookingSerializer
    authentication_classes = [SupabaseAuthAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.select_related('availability__barber').filter(customer_id=self.request.user.pk)
