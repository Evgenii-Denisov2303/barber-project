-- Demo seed for Istanbul

with loc as (
  insert into locations (name, address, phone)
  values ('Istanbul', 'Роторная ул., 27Е, Казань', '+7 (986) 901-23-98')
  returning id
), u as (
  insert into users (role, full_name, phone)
  values
    ('admin','Администратор Istanbul', '+7 (900) 000-00-01'),
    ('barber','Азамат Хусаинов', '+7 (900) 000-00-02'),
    ('barber','Рамиль Сафин', '+7 (900) 000-00-03'),
    ('barber','Ильдар Галиуллин', '+7 (900) 000-00-04'),
    ('barber','Тимур Мухаметшин', '+7 (900) 000-00-05'),
    ('barber','Булат Зиннуров', '+7 (900) 000-00-06'),
    ('barber','Руслан Каримов', '+7 (900) 000-00-07'),
    ('client','Сергей М., клиент', '+7 (900) 123-45-67')
  returning id, role, full_name
)
insert into barbers (user_id, location_id, bio, rating)
select u.id, l.id,
  case u.full_name
    when 'Азамат Хусаинов' then 'Классические и фейд‑стрижки, 6 лет опыта.'
    when 'Рамиль Сафин' then 'Борода и форма, аккуратная машинка.'
    when 'Ильдар Галиуллин' then 'Быстрая стрижка, аккуратные контуры.'
    when 'Тимур Мухаметшин' then 'Сложные формы и укладки.'
    when 'Булат Зиннуров' then 'Детские стрижки и универсальные.'
    else 'Барбер с опытом и хорошими отзывами.'
  end,
  4.7
from u, loc l
where u.role = 'barber';

insert into services (name, duration_min, price) values
  ('Мужская стрижка', 60, 900),
  ('Стрижка машинкой', 30, 500),
  ('Стрижка + борода', 90, 1300),
  ('Оформление бороды', 30, 500),
  ('Детская стрижка', 45, 700),
  ('Укладка', 20, 300);

-- Link every barber to every service
insert into barber_services (barber_id, service_id)
select b.id, s.id from barbers b, services s;

-- Working hours: 10:00–22:00 daily
insert into working_hours (location_id, weekday, open_time, close_time)
select l.id, d, '10:00', '22:00'
from locations l, generate_series(1,7) as d;
