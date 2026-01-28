# Auth setup (Supabase)

1) Применить миграции:
- 0001_init.sql
- 0002_rpc.sql
- 0003_auth_rls.sql
- 0004_reschedule.sql
- 0005_barber_photos.sql
- 0006_notifications.sql
- 0007_notification_templates.sql
- 0008_notification_logs.sql

2) Включить Email/Password в Supabase Auth.

3) Создать Storage bucket для фото мастеров:
- Bucket: `barber-photos`
- Доступ: public (для отображения в приложении)
- Policy: разрешить insert/update для authenticated пользователей (или только admin).

4) Telegram уведомления (опционально):
- Создайте бота через @BotFather и получите токен.
- Добавьте бота в чат/канал и получите `chat_id`.
- В Supabase Edge Functions задайте env:
  - `TELEGRAM_BOT_TOKEN`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Деплой функции: `supabase functions deploy notify-telegram`
- В админке → Настройки включите Telegram и укажите `chat_id`.

5) SMS (МТС Exolve, опционально):
- Получите API ключ в MTS Exolve и зарегистрируйте Sender/номер.
- В Supabase Edge Functions задайте env:
  - `MTS_EXOLVE_API_KEY`
- В админке → Настройки включите SMS и укажите `sms_sender`.

6) Создать администратора:
- Зарегистрируйтесь через web‑панель (AuthPanel в админке/панели мастера)
- В SQL Editor выполните:
```
update public.users set role = 'admin' where id = '<auth_user_id>';
```

Альтернатива: в админке → Настройки → “Назначить роль” по email.

7) Создать мастера:
- В админке добавьте мастера (создаст пользователя с ролью barber)
- При желании создайте auth‑аккаунт и обновите users.id на auth uid.

Важно: чтобы мастер входил под своим аккаунтом, `public.users.id` должен совпадать с `auth.users.id`.
