# API контракты (MVP)

Подход: один backend (Supabase/Postgres) + REST/RPC‑слой.
Ниже — минимальный контракт, удобный для клиента и веб‑панелей.

## Справочники

GET /services
- Ответ: список активных услуг

GET /barbers
- Query: service_id (optional)
- Ответ: активные мастера + рейтинг + краткое био

GET /locations
- Ответ: список филиалов (в MVP один)

## Свободные слоты

GET /availability
Query:
- date=YYYY-MM-DD
- service_id=uuid
- barber_id=uuid (optional, если нужно показать всех)

Ответ:
```
{
  "date": "2026-02-01",
  "service_id": "...",
  "barber_id": "...",
  "slots": ["10:00", "10:30", "11:00"]
}
```

## Записи (клиент)

POST /appointments
Body:
```
{
  "service_id": "...",
  "barber_id": "...",
  "location_id": "...",
  "start_at": "2026-02-01T10:00:00+03:00"
}
```
Ответ: созданная запись

Примечание: при включённом RLS запись создаётся от имени текущего пользователя (auth.uid()).

PATCH /appointments/:id
Body (пример):
```
{
  "status": "cancelled",
  "note": "Не успеваю"
}
```

GET /appointments/my
- Возвращает записи текущего клиента

## Панель мастера

GET /barbers/:id/appointments
Query:
- date=YYYY-MM-DD
- status=pending|confirmed|completed|cancelled

PATCH /appointments/:id
Body:
```
{
  "status": "confirmed"
}
```

## Админка

POST /services, PATCH /services/:id
POST /barbers, PATCH /barbers/:id
POST /working-hours, PATCH /working-hours/:id
POST /time-off, PATCH /time-off/:id

## Рекомендуемые RPC функции (Supabase)

1) rpc_get_availability(date, service_id, barber_id nullable)
- Возвращает список свободных слотов

2) rpc_create_appointment(service_id, barber_id, location_id, start_at)
- В одной транзакции проверяет пересечения и создаёт запись

3) rpc_reschedule_appointment(appointment_id, new_start_at)
- Меняет время с проверкой свободного слота
 - Возвращает id записи или ошибку slot_taken

## Уведомления (Telegram)

Edge Function: `notify-telegram`
Body:
```
{
  "appointmentId": "uuid",
  "event": "created|rescheduled|cancelled|confirmed|status"
}
```
Отправляет сообщение в Telegram и SMS (если каналы включены в настройках).

Edge Function: `notify-test`
Body:
```
{
  "locationId": "uuid",
  "channel": "telegram|sms",
  "phone": "+79000000000"
}
```
Тестовый пуш для выбранного канала (SMS требует номер получателя).

Поддерживаемые плейсхолдеры шаблонов:
`{event}`, `{date}`, `{time}`, `{datetime}`, `{service}`, `{barber}`, `{client}`, `{client_phone}`, `{location}`, `{address}`, `{location_phone}`, `{status}`.

Логи доставки:
- Таблица `notification_logs` хранит статус каждой попытки отправки (sent/error/skipped).
