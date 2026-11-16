import json
import hashlib
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
        message = format_booking_caption(booking)
        boundary = 'GupfitTelegramBoundary7MA4YWxkTrZu0gW'
        filename = Path(booking.payment_receipt.name).name.replace('"', '') or f'booking-{booking.pk}-receipt'
        content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        keyboard = json.dumps({'inline_keyboard': [[
            {'text': 'Approve', 'callback_data': f'booking:{booking.pk}:approve'},
            {'text': 'Reject', 'callback_data': f'booking:{booking.pk}:reject'},
        ]]})
        parts = [
            _multipart_field(boundary, 'chat_id', chat_id),
            _multipart_field(boundary, 'caption', message),
            _multipart_field(boundary, 'reply_markup', keyboard),
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


def format_booking_caption(booking, status_label='pending review'):
    availability = booking.availability
    barber = availability.barber
    return '\n'.join([
        f'Gupfit booking ({status_label})',
        f"Customer: {booking.customer_name}",
        f"Phone: {booking.customer_phone or 'Not provided'}",
        f"Email: {booking.customer_email}",
        f'Barber: {barber.name}',
        f"Date: {availability.date:%d %b %Y}",
        f"Time: {availability.start_time:%H:%M}–{availability.end_time:%H:%M}",
    ])


def _multipart_field(boundary, name, value):
    return (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
        f'{value}\r\n'
    ).encode('utf-8')


def answer_callback_query(callback_query_id, text):
    return _telegram_json('answerCallbackQuery', {
        'callback_query_id': callback_query_id,
        'text': text,
    })


def update_booking_message(chat_id, message_id, booking, status_label):
    return _telegram_json('editMessageCaption', {
        'chat_id': chat_id,
        'message_id': message_id,
        'caption': format_booking_caption(booking, status_label),
        'reply_markup': {'inline_keyboard': []},
    })


def hash_link_token(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def send_customer_link_message(chat_id):
    return send_customer_message(
        chat_id,
        "You're connected to Gupfit booking updates. We'll message you when your booking is confirmed or cancelled.",
    )


def send_customer_message(chat_id, text):
    return _telegram_json('sendMessage', {'chat_id': chat_id, 'text': text})


def send_customer_booking_status_notification(booking):
    from .models import CustomerTelegramConnection

    connection = CustomerTelegramConnection.objects.filter(customer_id=booking.customer_id).first()
    if not connection or not connection.telegram_chat_id:
        return

    availability = booking.availability
    if booking.status == booking.Status.CONFIRMED:
        heading = 'Your Gupfit booking is confirmed.'
    elif booking.status == booking.Status.CANCELLED:
        heading = 'Your Gupfit booking was cancelled.'
    else:
        return
    message = '\n'.join([
        heading,
        f'Barber: {availability.barber.name}',
        f'Date: {availability.date:%d %b %Y}',
        f'Time: {availability.start_time:%H:%M}-{availability.end_time:%H:%M}',
    ])
    _telegram_json('sendMessage', {'chat_id': connection.telegram_chat_id, 'text': message})


def _telegram_json(method, payload):
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    if not bot_token:
        return False
    try:
        request = Request(
            f'https://api.telegram.org/bot{bot_token}/{method}',
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urlopen(request, timeout=5) as response:
            result = json.loads(response.read().decode('utf-8'))
        if not result.get('ok'):
            logger.warning('Telegram %s failed: %s', method, result.get('description'))
        return bool(result.get('ok'))
    except (URLError, TimeoutError, ValueError, OSError):
        logger.exception('Telegram %s request failed', method)
        return False
