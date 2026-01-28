-- Notification templates + barber telegram fields

alter table notification_settings
  add column telegram_template text,
  add column sms_template text;

alter table barbers
  add column telegram_chat_id text,
  add column telegram_enabled boolean default false;
