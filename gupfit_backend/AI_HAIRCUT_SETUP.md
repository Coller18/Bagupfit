# Photo haircut suggestions

The customer booking page can send an optional photo to OpenAI's vision model and show written haircut suggestions. The photo is sent only after the customer selects it, checks the consent box, and submits the request. Gupfit does not save the photo. Requests require a signed-in customer and are limited to five per account per hour.

## Enable on Render

1. Create an OpenAI API key in the OpenAI API platform. API usage may incur charges; a ChatGPT subscription is separate from API billing.
2. In the Render dashboard, open the Django backend service and add `OPENAI_API_KEY` under **Environment**. Keep this key on the backend only; never add it to the customer frontend.
3. Optionally set `OPENAI_VISION_MODEL`. If omitted, the backend uses `gpt-4.1-mini`.
4. Deploy the latest backend and customer frontend code.

The tool accepts JPEG, PNG, or WebP photos up to 5 MB. It returns text recommendations, not a generated hairstyle preview. The barber should confirm that a suggested cut suits the client's hair in person.
