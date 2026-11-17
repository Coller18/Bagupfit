# Telegram booking notifications and approvals

The backend sends you a Telegram message with the uploaded receipt and **Approve** / **Reject** buttons when a customer books. Customers can optionally link their own Telegram account after booking; the bot then messages them when you confirm or cancel their booking.

## 1. Deploy the latest backend code

Deploy the latest project changes to your Render backend service first. The webhook URL will only work after Render is running the updated code. This feature adds a database table, so make sure your backend deployment applies Django migrations with `python manage.py migrate`.

## 2. Add a webhook secret in Render

Generate a secret on your own Windows computer. Open PowerShell on your computer (not in Render) and run:

```powershell
$secret = python -c "import secrets; print(secrets.token_urlsafe(32))"
$secret
```

Copy the value it prints. In the Render dashboard, open your backend web service, go to **Environment**, and add:

- `TELEGRAM_WEBHOOK_SECRET` — paste the generated value

The service should redeploy after you save. Keep this PowerShell window open; the `$secret` variable is used in the next step.

Your existing `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` values should remain set in Render. Do not share the bot token.

Also add `TELEGRAM_BOT_USERNAME` in Render. Set it to your bot's username without the `@` (for example, `gupfit_booking_bot`). This lets the booking page create the client's opt-in link.

## 3. Register the webhook with Telegram

In Render, open the backend service and copy its public URL, such as `https://gupfit-api.onrender.com`. Back in the same local PowerShell window, replace the example URL below with your actual Render URL and run these commands:

```powershell
$token = Read-Host "Paste your Telegram bot token"
$body = @{
  url = "https://YOUR-SERVICE.onrender.com/api/telegram/webhook/"
  secret_token = $secret
  allowed_updates = '["message","callback_query"]'
}
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -Body $body
```

This command runs on your Windows computer, not in Render. Telegram should respond with `ok: true`. Do not share the command output or the bot token.

## What happens next

New booking alerts include the receipt and booking details. Approve marks the booking confirmed; Reject marks it cancelled. The buttons are removed after a decision. The webhook accepts owner actions only from the configured private Telegram chat and checks the webhook secret. Existing Telegram messages do not gain buttons retroactively.

Customers can connect Telegram from their Gupfit profile, before or after making a booking. They tap **Connect Telegram**, then tap **Start** in the bot. The link is one-time and expires after seven days. Once connected, that Gupfit account receives a Telegram message when a booking is confirmed or cancelled. Clients who do not connect Telegram can still see their booking status on the website.

Telegram receives the uploaded receipt and booking details, so enable this only if that matches your privacy practices. A failed Telegram notification does not undo or reject the booking.
