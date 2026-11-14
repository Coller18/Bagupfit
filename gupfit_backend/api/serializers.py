from django.utils import timezone
from rest_framework import serializers
from rest_framework.reverse import reverse
from pathlib import Path
from .models import Availability, Barber, Booking, HaircutWork
from .public_storage import upload_public_image


class BarberSerializer(serializers.ModelSerializer):
    photo = serializers.FileField(required=False, write_only=True)
    photo_url = serializers.SerializerMethodField()
    remove_photo = serializers.BooleanField(required=False, write_only=True)

    class Meta:
        model = Barber
        fields = ['id', 'name', 'bio', 'photo', 'photo_url', 'remove_photo', 'is_active', 'created_at']

    def get_photo_url(self, barber):
        if barber.photo_url:
            return barber.photo_url
        if barber.photo:
            request = self.context.get('request')
            return reverse('barber-photo', kwargs={'pk': barber.pk}, request=request)
        return ''

    def validate_photo(self, photo):
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
        extension = Path(photo.name).suffix.lower()
        if extension not in allowed_extensions:
            raise serializers.ValidationError('Use a JPG, PNG, or WebP image.')
        if photo.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('The image must be 5 MB or smaller.')
        content_type = getattr(photo, 'content_type', '')
        if content_type and content_type not in {'image/jpeg', 'image/png', 'image/webp'}:
            raise serializers.ValidationError('Upload a JPG, PNG, or WebP image.')
        return photo

    def create(self, validated_data):
        validated_data.pop('remove_photo', False)
        photo = validated_data.pop('photo', None)
        if photo:
            validated_data['photo_url'] = upload_public_image(photo, 'barbers')
        return super().create(validated_data)

    def update(self, instance, validated_data):
        remove_photo = validated_data.pop('remove_photo', False)
        photo = validated_data.pop('photo', None)
        if remove_photo or photo:
            if instance.photo:
                instance.photo.delete(save=False)
                instance.photo = ''
            instance.photo_url = ''
        if photo:
            validated_data['photo_url'] = upload_public_image(photo, 'barbers')
        return super().update(instance, validated_data)


class HaircutWorkSerializer(serializers.ModelSerializer):
    image = serializers.FileField(write_only=True, required=False)
    image_url = serializers.URLField(read_only=True)

    class Meta:
        model = HaircutWork
        fields = ['id', 'title', 'description', 'image', 'image_url', 'is_published', 'sort_order', 'created_at']
        read_only_fields = ['id', 'image_url', 'created_at']

    def validate_image(self, image):
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
        if Path(image.name).suffix.lower() not in allowed_extensions:
            raise serializers.ValidationError('Use a JPG, PNG, or WebP image.')
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('The image must be 5 MB or smaller.')
        content_type = getattr(image, 'content_type', '')
        if content_type and content_type not in {'image/jpeg', 'image/png', 'image/webp'}:
            raise serializers.ValidationError('Upload a JPG, PNG, or WebP image.')
        return image

    def create(self, validated_data):
        image = validated_data.pop('image', None)
        if not image:
            raise serializers.ValidationError({'image': 'Choose a haircut photo to upload.'})
        validated_data['image_url'] = upload_public_image(image, 'haircut-works')
        return super().create(validated_data)

    def update(self, instance, validated_data):
        image = validated_data.pop('image', None)
        if image:
            validated_data['image_url'] = upload_public_image(image, 'haircut-works')
        return super().update(instance, validated_data)


class AvailabilitySerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source='barber.name', read_only=True)
    is_booked = serializers.SerializerMethodField()
    booking_status = serializers.SerializerMethodField()

    class Meta:
        model = Availability
        fields = ['id', 'barber', 'barber_name', 'date', 'start_time', 'end_time', 'is_booked', 'booking_status', 'created_at']
        read_only_fields = ['id', 'barber_name', 'is_booked', 'created_at']

    def get_is_booked(self, availability):
        return self.get_booking_status(availability) is not None

    def get_booking_status(self, availability):
        statuses = {booking.status for booking in availability.bookings.all()}
        if Booking.Status.PENDING_REVIEW in statuses:
            return Booking.Status.PENDING_REVIEW
        if Booking.Status.CONFIRMED in statuses:
            return Booking.Status.CONFIRMED
        return None

    def validate(self, attrs):
        barber = attrs.get('barber', getattr(self.instance, 'barber', None))
        date = attrs.get('date', getattr(self.instance, 'date', None))
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))

        if barber and not barber.is_active:
            raise serializers.ValidationError({'barber': 'Choose an active barber.'})
        if date and date < timezone.localdate():
            raise serializers.ValidationError({'date': 'Availability must be today or a future date.'})
        if date == timezone.localdate() and start_time and start_time <= timezone.localtime().time():
            raise serializers.ValidationError({'start_time': 'Choose a future time.'})
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'End time must be later than start time.'})

        if barber and date and start_time and end_time:
            overlaps = Availability.objects.filter(
                barber=barber,
                date=date,
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            if self.instance:
                overlaps = overlaps.exclude(pk=self.instance.pk)
            if overlaps.exists():
                raise serializers.ValidationError('This time overlaps another availability slot for the barber.')

        return attrs


class CustomerBookingSerializer(serializers.ModelSerializer):
    payment_receipt = serializers.FileField(write_only=True, required=True)

    class Meta:
        model = Booking
        fields = ['id', 'availability', 'payment_receipt', 'customer_name', 'customer_email', 'customer_phone', 'status', 'created_at']
        read_only_fields = ['id', 'customer_name', 'customer_email', 'customer_phone', 'status', 'created_at']

    def validate_payment_receipt(self, receipt):
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.pdf'}
        extension = Path(receipt.name).suffix.lower()
        if extension not in allowed_extensions:
            raise serializers.ValidationError('Upload a JPG, PNG, WebP, or PDF receipt.')
        if receipt.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('The receipt must be 10 MB or smaller.')
        content_type = getattr(receipt, 'content_type', '')
        allowed_types = {'image/jpeg', 'image/png', 'image/webp', 'application/pdf'}
        if content_type and content_type not in allowed_types:
            raise serializers.ValidationError('Upload a JPG, PNG, WebP, or PDF receipt.')
        return receipt

    def validate_availability(self, availability):
        if not availability.barber.is_active:
            raise serializers.ValidationError('This barber is not accepting bookings.')
        if availability.date < timezone.localdate():
            raise serializers.ValidationError('This availability date has passed.')
        if (
            availability.date == timezone.localdate()
            and availability.start_time <= timezone.localtime().time()
        ):
            raise serializers.ValidationError('This availability time has passed.')
        if availability.bookings.filter(status__in=[Booking.Status.PENDING_REVIEW, Booking.Status.CONFIRMED]).exists():
            raise serializers.ValidationError('This time slot is no longer available.')
        return availability


class AdminBookingSerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source='availability.barber.name', read_only=True)
    date = serializers.DateField(source='availability.date', read_only=True)
    start_time = serializers.TimeField(source='availability.start_time', read_only=True)
    end_time = serializers.TimeField(source='availability.end_time', read_only=True)
    has_payment_receipt = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'barber_name', 'date', 'start_time', 'end_time',
            'customer_name', 'customer_email', 'customer_phone', 'status', 'has_payment_receipt', 'created_at',
        ]
        read_only_fields = fields

    def get_has_payment_receipt(self, booking):
        return bool(booking.payment_receipt)


class AdminBookingReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['id', 'status']
        read_only_fields = ['id']

    def validate_status(self, status_value):
        if self.instance.status != Booking.Status.PENDING_REVIEW:
            raise serializers.ValidationError('Only bookings awaiting receipt review can be changed.')
        if status_value not in {Booking.Status.CONFIRMED, Booking.Status.CANCELLED}:
            raise serializers.ValidationError('Review the receipt by approving or rejecting this booking.')
        return status_value
