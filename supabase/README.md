# Supabase schema

- migrations/0001_init.sql — основная схема
- migrations/0002_rpc.sql — функции для слотов и записи
- migrations/0003_auth_rls.sql — auth-триггер и RLS политики
- migrations/0004_reschedule.sql — перенос записей
- migrations/0005_barber_photos.sql — фото мастеров
- migrations/0006_notifications.sql — настройки уведомлений
- migrations/0007_notification_templates.sql — шаблоны уведомлений + telegram для мастеров
- migrations/0008_notification_logs.sql — логи доставки уведомлений
- migrations/0009_appointment_validation.sql — проверка рабочего времени и перерывов при создании/переносе
- seed.sql — демо‑данные для Istanbul

Как применить (после инициализации проекта Supabase):
1) Выполнить миграцию
2) Запустить seed.sql

Рекомендуется создать RPC функции для свободных слотов и записи (см. docs/03_api.md).

Role setup:
- Зарегистрируйтесь через web/mobile
- В таблице users поменяйте роль на admin для вашего auth uid

Storage:
- Создайте public bucket `barber-photos` для фото мастеров (см. docs/09_auth_setup.md).

Notifications:
- Edge function `notify-telegram` отправляет Telegram и SMS (MTS Exolve) если включено в настройках.
