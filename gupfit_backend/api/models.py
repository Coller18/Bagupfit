from django.db import models
from django.db.models import Q
from .storage import PrivateReceiptStorage


class Barber(models.Model):
    name = models.CharField(max_length=100)
    bio = models.TextField(blank=True)
    photo_url = models.URLField(blank=True)
    photo = models.FileField(upload_to='barbers/', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class HaircutWork(models.Model):
    title = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField()
    is_published = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', '-created_at']
        verbose_name = 'haircut work'
        verbose_name_plural = 'haircut works'

    def __str__(self):
        return self.title or f'Haircut work {self.pk}'


class Availability(models.Model):
    barber = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name='availability')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'start_time', 'barber__name']
        constraints = [
            models.UniqueConstraint(
                fields=['barber', 'date', 'start_time'],
                name='unique_barber_availability_start',
            ),
            models.CheckConstraint(
                condition=Q(end_time__gt=models.F('start_time')),
                name='availability_end_after_start',
            ),
        ]

    def __str__(self):
        return f'{self.barber} - {self.date} {self.start_time}-{self.end_time}'


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING_REVIEW = 'pending_review', 'Pending review'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'

    availability = models.ForeignKey(Availability, on_delete=models.PROTECT, related_name='bookings')
    customer_id = models.UUIDField(null=True, blank=True, db_index=True)
    customer_name = models.CharField(max_length=150)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=30, blank=True)
    status = models.CharField(max_length=14, choices=Status.choices, default=Status.CONFIRMED)
    payment_receipt = models.FileField(upload_to='payment_receipts/', storage=PrivateReceiptStorage(), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['availability'],
                condition=Q(status__in=['pending_review', 'confirmed']),
                name='one_active_booking_per_slot',
            ),
        ]

    def __str__(self):
        return f'{self.customer_name} - {self.availability}'


class CustomerTelegramConnection(models.Model):
    customer_id = models.UUIDField(unique=True)
    telegram_chat_id = models.CharField(max_length=64, unique=True, null=True, blank=True)
    link_token_hash = models.CharField(max_length=64, unique=True, null=True, blank=True)
    link_token_expires_at = models.DateTimeField(null=True, blank=True)
    connected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'customer Telegram connection'
        verbose_name_plural = 'customer Telegram connections'

    def __str__(self):
        return f'Telegram connection for customer {self.customer_id}'
