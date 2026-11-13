from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0003_availability_booking_and_admin_permissions'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='customer_id',
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
    ]
