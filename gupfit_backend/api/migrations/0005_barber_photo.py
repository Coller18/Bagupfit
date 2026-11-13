from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0004_booking_customer_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='barber',
            name='photo',
            field=models.FileField(blank=True, upload_to='barbers/'),
        ),
    ]
