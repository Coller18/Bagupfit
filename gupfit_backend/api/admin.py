from django.contrib import admin
from .models import Availability, Barber, Booking, HaircutWork


@admin.register(HaircutWork)
class HaircutWorkAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_published', 'sort_order', 'created_at']
    list_filter = ['is_published']
    search_fields = ['title', 'description']


@admin.register(Barber)
class BarberAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ['barber', 'date', 'start_time', 'end_time']
    list_filter = ['date', 'barber']
    search_fields = ['barber__name']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['customer_name', 'barber_name', 'date', 'start_time', 'status', 'created_at']
    list_filter = ['status', 'availability__date', 'availability__barber']
    search_fields = ['customer_name', 'customer_email', 'customer_phone']
    readonly_fields = ['availability', 'customer_name', 'customer_email', 'customer_phone', 'created_at']

    @admin.display(description='Barber')
    def barber_name(self, obj):
        return obj.availability.barber.name

    @admin.display(description='Date')
    def date(self, obj):
        return obj.availability.date

    @admin.display(description='Start time')
    def start_time(self, obj):
        return obj.availability.start_time
