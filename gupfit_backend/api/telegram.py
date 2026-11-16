import json
import logging
import mimetypes
import os
from pathlib import Path
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
        boundary = 'GupfitTelegramBoundary7MA4YWxkTrZu0gW'
        filename = Path(booking.payment_receipt.name).name.replace('"', '') or f'booking-{booking.pk}-receipt'
        content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        parts = [
            _multipart_field(boundary, 'chat_id', chat_id),
            _multipart_field(boundary, 'caption', message),
        ]
        with booking.payment_receipt.open('rb') as receipt:
            receipt_bytes = receipt.read()
        document_header = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="document"; filename="{filename}"\r\n'
            f'Content-Type: {content_type}\r\n\r\n'
        ).encode('utf-8')
        parts.append(document_header + receipt_bytes + f'\r\n--{boundary}--\r\n'.encode('utf-8'))
        request = Request(
            f'https://api.telegram.org/bot{bot_token}/sendDocument',
            data=b''.join(parts),
            headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
            method='POST',
        )
        with urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
        if not result.get('ok'):
            logger.warning('Telegram rejected a new booking notification: %s', result.get('description'))
    except (URLError, TimeoutError, ValueError, OSError):
        logger.exception('Could not send Telegram notification for booking %s', booking.pk)


def _multipart_field(boundary, name, value):
    return (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
        f'{value}\r\n'
    ).encode('utf-8')
