# Telegram booking notifications

The backend can send a Telegram message after a customer booking is successfully committed. The notification is optional: if either environment variable is unset, bookings work normally without sending a message.

## Configure the bot

1. In Telegram, message **@BotFather**, create a bot with `/newbot`, and copy its token.
2. Open the new bot from your Telegram account and send `/start`.
3. Get your chat ID from `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` after sending `/start`. Keep the bot token private; it grants control over the bot.
4. In Render, open the Django backend web service, go to **Environment**, and add:
   - `TELEGRAM_BOT_TOKEN` — the token from BotFather
   - `TELEGRAM_CHAT_ID` — your Telegram chat ID
5. Save the changes and redeploy/restart the service.

Each new booking produces a Telegram document message with the uploaded receipt and a caption containing the customer and appointment details and pending-review status. The notification is sent after the database transaction commits, so a failed booking will not trigger an alert. A Telegram delivery problem is logged and does not undo or reject a booking. Telegram will receive and process the receipt and booking details, so enable this only if that matches your privacy practices.
