# Роли и доступ (Supabase RLS)

## Роли
- client: видит свои записи
- barber: видит свои записи и свой профиль
- admin: доступ ко всем записям и настройкам

## Модель авторизации
- В `users` хранится роль пользователя
- В Supabase включаем RLS и проверяем `auth.uid()`
- Триггер `handle_new_user` создает запись в `users` при регистрации

## Примеры политик (концепт)

### appointments: чтение
- client: читать только свои записи
- barber: читать записи, где barber_id = его
- admin: читать все

### appointments: создание
- client: может создавать запись только от своего имени
- barber/admin: может создавать записи для клиентов (в админке)

### services, barbers, working_hours
- чтение всем
- изменение только admin

## Пример политики для appointments (схематично)
```
-- client can read own
create policy "client read own"
  on appointments for select
  using (client_id = auth.uid());

-- barber can read own
create policy "barber read own"
  on appointments for select
  using (barber_id in (select id from barbers where user_id = auth.uid()));

-- admin can read all
create policy "admin read all"
  on appointments for select
  using ((select role from users where id = auth.uid()) = 'admin');
```

Важно: для создания/переноса записи лучше использовать RPC‑функции с проверкой пересечений.

Настройка описана в `supabase/migrations/0003_auth_rls.sql`.
