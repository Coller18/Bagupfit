import base64
import json
import logging
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


logger = logging.getLogger(__name__)


class HaircutSuggestionError(Exception):
    pass


def suggest_haircuts_from_photo(image_bytes, image_type, style_goal):
    api_key = os.environ.get('OPENAI_API_KEY', '').strip()
    if not api_key:
        raise HaircutSuggestionError('Photo suggestions are not configured yet.')

    image_data = base64.b64encode(image_bytes).decode('ascii')
    payload = {
        'model': os.environ.get('OPENAI_VISION_MODEL', 'gpt-4.1-mini'),
        'store': False,
        'max_output_tokens': 350,
        'input': [{
            'role': 'user',
            'content': [
                {
                    'type': 'input_text',
                    'text': (
                        'You are a friendly barbershop style consultant. Review this customer photo only to assess visible '
                        'hair characteristics such as current length, texture, and styling. Do not identify the person or '
                        'infer age, ethnicity, health, or other sensitive traits. Do not make negative comments about their '
                        'appearance. Suggest realistic barber cuts, be clear if the photo is not suitable for judging the '
                        'hair, and mention that a barber should confirm what will work in person.\n\n'
                        f"Customer's preference: {style_goal}.\n\n"
                        'Reply in this format with concise plain text:\n'
                        'BEST MATCH: [one haircut]\n'
                        'WHY IT MAY WORK: [one or two sentences]\n'
                        'OTHER OPTIONS: [two alternatives]\n'
                        'ASK YOUR BARBER: [one practical sentence]'
                    ),
                },
                {
                    'type': 'input_image',
                    'image_url': f'data:{image_type};base64,{image_data}',
                    'detail': 'high',
                },
            ],
        }],
    }
    request = Request(
        'https://api.openai.com/v1/responses',
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )

    try:
        with urlopen(request, timeout=45) as response:
            result = json.loads(response.read().decode('utf-8'))
    except HTTPError as error:
        logger.warning('Haircut suggestion provider returned HTTP %s.', error.code)
        raise HaircutSuggestionError('We could not generate a suggestion right now. Please try again.') from error
    except (URLError, TimeoutError, ValueError, OSError) as error:
        logger.exception('Haircut suggestion provider request failed.')
        raise HaircutSuggestionError('We could not generate a suggestion right now. Please try again.') from error

    text_parts = [
        part.get('text', '').strip()
        for item in result.get('output', [])
        if item.get('type') == 'message'
        for part in item.get('content', [])
        if part.get('type') == 'output_text' and part.get('text')
    ]
    suggestion = '\n'.join(text_parts).strip()
    if not suggestion:
        logger.warning('Haircut suggestion provider returned no text output.')
        raise HaircutSuggestionError('We could not generate a suggestion from that photo. Please try another photo.')
    return suggestion
