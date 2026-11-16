# Telegram booking notifications

The backend can send a Telegram message after a customer booking is successfully committed. The notification is optional: if either environment variable is unset, bookings work normally without sending a message.

## Configure the bot

1. In Telegram, message **@BotFather**, create a bot with `/newbot`, and copy its token.
2. Open the new bot from your Telegram account and send `/start`.
3. Get your chat ID from `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` after sending `/start`. Keep the bot token private; it grants control over the bot.
4. Generate a long random webhook secret (for example, run `python -c "import secrets; print(secrets.token_urlsafe(32))"`). In Render, open the Django backend web service, go to **Environment**, and add:
   - `TELEGRAM_BOT_TOKEN` — the token from BotFather
   - `TELEGRAM_CHAT_ID` — your Telegram chat ID
   - `TELEGRAM_WEBHOOK_SECRET` — the random secret you generated
5. Save the changes and redeploy/restart the service. Your booking alerts will have **Approve** and **Reject** buttons after this deploy.
6. Register the webhook once from PowerShell, replacing the placeholders with your values and your Render service hostname:

   ```powershell
   $token = Read-Host "Telegram bot token"
   $secret = Read-Host "Telegram webhook secret"
   $body = @{
     url = "https://YOUR-SERVICE.onrender.com/api/telegram/webhook/"
     secret_token = $secret
     allowed_updates = '["callback_query"]'
   }
   Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -Body $body
   ```

   Telegram should return `ok: true`. The bot token is used in this local command; do not share the command or its output if it contains your token.

Each new booking produces a Telegram document message with the uploaded receipt and a caption containing the customer and appointment details and pending-review status. Approve and Reject update the booking in Gupfit and remove the buttons from the message. The webhook accepts actions only from the configured private chat and checks Telegram's webhook secret. The notification is sent after the database transaction commits, so a failed booking will not trigger an alert. A Telegram delivery problem is logged and does not undo or reject a booking. Telegram will receive and process the receipt and booking details, so enable this only if that matches your privacy practices.
