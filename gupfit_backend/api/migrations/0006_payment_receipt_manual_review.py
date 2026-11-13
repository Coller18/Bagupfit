import django.db.models
from django.db import migrations, models
from django.db.models import Q

import api.storage


def grant_booking_review_permission(apps, schema_editor):
    alias = schema_editor.connection.alias
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    group, _ = Group.objects.using(alias).get_or_create(name='Sub-admin')
    content_type, _ = ContentType.objects.using(alias).get_or_create(app_label='api', model='booking')
    permission, _ = Permission.objects.using(alias).get_or_create(
        content_type=content_type,
        codename='change_booking',
        defaults={'name': 'Can change booking'},
    )
    group.permissions.add(permission)


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0005_barber_photo'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='booking',
            name='one_confirmed_booking_per_slot',
        ),
        migrations.AddField(
            model_name='booking',
            name='payment_receipt',
            field=models.FileField(blank=True, storage=api.storage.PrivateReceiptStorage(), upload_to='payment_receipts/'),
        ),
        migrations.AlterField(
            model_name='booking',
            name='status',
            field=models.CharField(
                choices=[('pending_review', 'Pending review'), ('confirmed', 'Confirmed'), ('cancelled', 'Cancelled')],
                default='confirmed',
                max_length=14,
            ),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.UniqueConstraint(
                condition=Q(status__in=['pending_review', 'confirmed']),
                fields=('availability',),
                name='one_active_booking_per_slot',
            ),
        ),
        migrations.RunPython(grant_booking_review_permission, migrations.RunPython.noop),
    ]
