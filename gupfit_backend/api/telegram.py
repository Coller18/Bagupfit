import json
import logging
import os
from urllib.error import URLError
from urllib.request import Request, urlopen


logger = logging.getLogger(__name__)


def send_new_booking_notification(booking):
    """Send an optional Telegram alert after a booking has committed."""
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    chat_id = os.environ.get('TELEGRAM_CHAT_ID', '').strip()
    if not bot_token or not chat_id:
        return

    try:
        availability = booking.availability
        barber = availability.barber
        message = '\n'.join([
            'New Gupfit booking (pending review)',
            f"Customer: {booking.customer_name}",
            f"Phone: {booking.customer_phone or 'Not provided'}",
            f"Email: {booking.customer_email}",
            f'Barber: {barber.name}',
            f"Date: {availability.date:%d %b %Y}",
            f"Time: {availability.start_time:%H:%M}–{availability.end_time:%H:%M}",
        ])
        request = Request(
            f'https://api.telegram.org/bot{bot_token}/sendMessage',
            data=json.dumps({'chat_id': chat_id, 'text': message}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urlopen(request, timeout=5) as response:
            result = json.loads(response.read().decode('utf-8'))
        if not result.get('ok'):
            logger.warning('Telegram rejected a new booking notification: %s', result.get('description'))
    except (URLError, TimeoutError, ValueError, OSError):
        logger.exception('Could not send Telegram notification for booking %s', booking.pk)
