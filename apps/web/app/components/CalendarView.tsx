'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { supabaseBrowser } from '../../lib/supabaseBrowser';
import { notifyTelegram } from '../../lib/notify';
import { AuthPanel } from './AuthPanel';

const calendarHours = { start: 10, end: 22 };
const rowHeight = 56;

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const monthLabels = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь'
];

type CalendarViewProps = {
  scope: 'admin' | 'barber';
};

type CalendarAppointment = {
  id: string;
  start: Date;
  end: Date;
  service: string;
  barber: string;
  barberId: string;
  status: string;
};

export function CalendarView({ scope }: CalendarViewProps) {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [dragPreview, setDragPreview] = useState<CalendarAppointment | null>(null);
  const [dragMessage, setDragMessage] = useState<string | null>(null);
  const [dragInvalid, setDragInvalid] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    item: CalendarAppointment;
    durationMin: number;
    moved: boolean;
    startX: number;
    startY: number;
    dayIndex?: number;
    desiredStartMin?: number;
    adjustedStartMin?: number;
    desiredDate?: Date;
    adjustedDate?: Date;
    invalid?: boolean;
  } | null>(null);

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const monthDays = useMemo(() =>
    getMonthGrid(currentDate),
    [currentDate]
  );

  const range = useMemo(() => {
    if (view === 'week') {
      return { start: weekStart, end: addDays(weekStart, 7) };
    }
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    return { start, end };
  }, [view, weekStart, currentDate]);

  const fetchAppointments = async () => {
    if (!supabaseBrowser) return;
    setStatus(null);
    let barberId: string | null = null;

    if (scope === 'barber') {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        setStatus('Нет сессии');
        return;
      }
      const { data: barberData } = await supabaseBrowser
        .from('barbers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      barberId = barberData?.id ?? null;
      if (!barberId) {
        setStatus('Профиль мастера не найден');
        return;
      }
    }

    const query = supabaseBrowser
      .from('appointments')
      .select('id, start_at, end_at, status, services(name), barbers(id, users(full_name))')
      .gte('start_at', range.start.toISOString())
      .lt('start_at', range.end.toISOString())
      .order('start_at', { ascending: true });

    const { data, error } = barberId ? await query.eq('barber_id', barberId) : await query;
    if (error || !data) {
      setStatus(error?.message ?? 'Ошибка загрузки');
      return;
    }

    setAppointments(
      data.map((item) => ({
        id: item.id,
        start: new Date(item.start_at),
        end: new Date(item.end_at),
        service: item.services?.name ?? 'Услуга',
        barber: item.barbers?.users?.full_name ?? 'Мастер',
        barberId: item.barbers?.id ?? '',
        status: item.status
      }))
    );
  };

  useEffect(() => {
    fetchAppointments();
  }, [view, currentDate, scope]);

  useEffect(() => {
    if (view !== 'week') return;
    if (!dragRef.current) return;

    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current || event.pointerId !== dragRef.current.pointerId) return;
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;

      const timeColWidth = 80;
      const totalWidth = rect.width - timeColWidth;
      const colWidth = totalWidth / 7;
      const x = event.clientX - rect.left - timeColWidth;
      const y = event.clientY - rect.top;

      const distance = Math.hypot(
        event.clientX - dragRef.current.startX,
        event.clientY - dragRef.current.startY
      );
      if (distance > 5) {
        dragRef.current.moved = true;
      }

      const dayIndex = clamp(Math.floor(x / colWidth), 0, 6);
      const totalMinutes = (calendarHours.end - calendarHours.start) * 60;
      const rawMinutes = (y / rowHeight) * 60;
      const maxStart = Math.max(0, totalMinutes - dragRef.current.durationMin);
      const snapped = clamp(Math.round(rawMinutes / 30) * 30, 0, maxStart);

      const dayBase = addDays(weekStart, dayIndex);
      dayBase.setHours(calendarHours.start, 0, 0, 0);

      const desiredDate = new Date(dayBase);
      desiredDate.setMinutes(desiredDate.getMinutes() + snapped);
      const desiredEnd = new Date(desiredDate.getTime() + dragRef.current.durationMin * 60000);

      const busyIntervals = getBusyIntervals(
        appointments,
        dayBase,
        dragRef.current.item.id,
        dragRef.current.item.barberId,
        totalMinutes
      );
      const adjustedStart = findNearestAvailableStart(
        snapped,
        dragRef.current.durationMin,
        busyIntervals,
        maxStart,
        30
      );

      dragRef.current.dayIndex = dayIndex;
      dragRef.current.desiredStartMin = snapped;
      dragRef.current.desiredDate = desiredDate;
      dragRef.current.invalid = adjustedStart === null;
      dragRef.current.adjustedStartMin = adjustedStart ?? undefined;

      let previewStart = desiredDate;
      let previewEnd = desiredEnd;
      let message: string | null = null;
      if (adjustedStart === null) {
        dragRef.current.adjustedDate = undefined;
        message = 'Нет свободного слота в этот день';
      } else if (adjustedStart !== snapped) {
        const adjustedDate = new Date(dayBase);
        adjustedDate.setMinutes(adjustedDate.getMinutes() + adjustedStart);
        dragRef.current.adjustedDate = adjustedDate;
        previewStart = adjustedDate;
        previewEnd = new Date(adjustedDate.getTime() + dragRef.current.durationMin * 60000);
        message = `Слот занят — ближайшее время ${formatTime(adjustedDate)}`;
      } else {
        dragRef.current.adjustedDate = desiredDate;
      }

      setDragInvalid(adjustedStart === null);
      setDragMessage(message);
      setDragPreview({
        ...dragRef.current.item,
        start: previewStart,
        end: previewEnd
      });
    };

    const handleUp = async () => {
      if (!dragRef.current) return;
      const { moved, item } = dragRef.current;
      const dragState = dragRef.current;
      dragRef.current = null;
      setDragMessage(null);
      setDragInvalid(false);

      if (!moved) {
        setSelected(item);
        setRescheduleDate(formatDate(item.start));
        setRescheduleTime(formatTime(item.start));
        setDragPreview(null);
        return;
      }

      if (dragState.invalid) {
        setStatus('Нет свободного слота для переноса');
        setDragPreview(null);
        return;
      }

      const nextStart = dragState.adjustedDate ?? dragState.desiredDate ?? dragPreview?.start;
      if (nextStart && nextStart.getTime() !== item.start.getTime()) {
        const showWarning = dragState.adjustedDate &&
          dragState.desiredDate &&
          dragState.adjustedDate.getTime() !== dragState.desiredDate.getTime();
        await rescheduleWithDate(
          item.id,
          nextStart,
          showWarning ? `Слот занят — запись перенесена на ${formatTime(nextStart)}` : undefined
        );
      }
      setDragPreview(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [view, weekStart, dragPreview, appointments]);

  const reschedule = async () => {
    if (!supabaseBrowser || !selected) return;
    if (!rescheduleDate || !rescheduleTime) {
      setStatus('Выберите дату и время');
      return;
    }
    const payload = `${rescheduleDate}T${rescheduleTime}:00+03:00`;
    const { error } = await supabaseBrowser.rpc('rpc_reschedule_appointment', {
      p_appointment_id: selected.id,
      p_new_start_at: payload
    });
    if (error) {
      setStatus(formatRpcError(error.message));
      return;
    }
    setStatus('Запись перенесена');
    setSelected(null);
    setRescheduleDate('');
    setRescheduleTime('');
    void notifyTelegram(selected.id, 'rescheduled');
    fetchAppointments();
  };

  const rescheduleWithDate = async (id: string, newDate: Date, note?: string) => {
    if (!supabaseBrowser) return;
    const payload = `${formatDate(newDate)}T${formatTime(newDate)}:00+03:00`;
    const { error } = await supabaseBrowser.rpc('rpc_reschedule_appointment', {
      p_appointment_id: id,
      p_new_start_at: payload
    });
    if (error) {
      setStatus(formatRpcError(error.message));
      return;
    }
    setStatus(note ?? 'Запись перенесена');
    void notifyTelegram(id, 'rescheduled');
    fetchAppointments();
  };

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  return (
    <section className="card calendar">
      <div className="calendar-toolbar">
        <div className="calendar-title">
          {monthLabels[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <div className="calendar-actions">
          <button className="button secondary" onClick={() => shiftDate(-1, view, setCurrentDate)}>
            ←
          </button>
          <button className="button secondary" onClick={() => setCurrentDate(new Date())}>
            Сегодня
          </button>
          <button className="button secondary" onClick={() => shiftDate(1, view, setCurrentDate)}>
            →
          </button>
          <button
            className={`button ${view === 'week' ? '' : 'secondary'}`}
            onClick={() => setView('week')}
          >
            Неделя
          </button>
          <button
            className={`button ${view === 'month' ? '' : 'secondary'}`}
            onClick={() => setView('month')}
          >
            Месяц
          </button>
        </div>
      </div>

      {view === 'week' ? (
        <div className="calendar-week">
          <div className="calendar-header">
            <div className="calendar-time-col" />
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="calendar-day-header">
                <span>{weekdayLabels[getWeekdayIndex(day)]}</span>
                <strong>{formatDay(day)}</strong>
              </div>
            ))}
          </div>
          <div className="calendar-body" ref={gridRef}>
            <div className="calendar-time-col">
              {getHours().map((hour) => (
                <div key={hour} className="calendar-hour">
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="calendar-day-column"
                style={{ height: getGridHeight() }}
              >
                {getHours().map((hour) => (
                  <div key={hour} className="calendar-hour-line" />
                ))}
                {appointments
                  .filter((item) => {
                    const start = dragPreview?.id === item.id ? dragPreview.start : item.start;
                    return isSameDay(start, day);
                  })
                  .map((item) => {
                    const isDragging = dragPreview?.id === item.id;
                    const start = isDragging ? dragPreview!.start : item.start;
                    const end = isDragging ? dragPreview!.end : item.end;
                    const top = getTopOffset(start);
                    const height = getHeight(start, end);
                    return (
                      <button
                        key={item.id}
                        className={`calendar-event status-${item.status} ${isDragging ? 'dragging' : ''} ${isDragging && dragInvalid ? 'invalid' : ''}`}
                        style={{ top, height }}
                        onPointerDown={(event) => {
                          if (view !== 'week') return;
                          event.preventDefault();
                          const duration = Math.max(
                            30,
                            Math.round((item.end.getTime() - item.start.getTime()) / 60000)
                          );
                          dragRef.current = {
                            pointerId: event.pointerId,
                            item,
                            durationMin: duration,
                            moved: false,
                            startX: event.clientX,
                            startY: event.clientY
                          };
                          setDragPreview(item);
                        }}
                        onClick={() => {
                          if (dragRef.current?.moved) return;
                          setSelected(item);
                          setRescheduleDate(formatDate(item.start));
                          setRescheduleTime(formatTime(item.start));
                        }}
                      >
                        <span>{formatTime(start)} · {item.service}</span>
                        <small>{item.barber}</small>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="calendar-month">
          <div className="calendar-month-header">
            {weekdayLabels.map((label) => (
              <div key={label} className="calendar-month-day">
                {label}
              </div>
            ))}
          </div>
          <div className="calendar-month-grid">
            {monthDays.map((day) => {
              const events = appointments.filter((item) => isSameDay(item.start, day));
              return (
                <div
                  key={day.toISOString()}
                  className={`calendar-month-cell ${day.getMonth() !== currentDate.getMonth() ? 'muted' : ''}`}
                >
                  <div className="calendar-month-date">{day.getDate()}</div>
                  {events.slice(0, 2).map((event) => (
                    <div key={event.id} className="calendar-month-event">
                      {formatTime(event.start)} {event.service}
                    </div>
                  ))}
                  {events.length > 2 ? (
                    <div className="calendar-month-more">+{events.length - 2} ещё</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected ? (
        <div className="calendar-drawer">
          <div>
            <strong>Перенести запись</strong>
            <p>{selected.service} · {selected.barber}</p>
          </div>
          <div className="calendar-drawer-controls">
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
            <input
              type="time"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
            />
            <button className="button" onClick={reschedule}>
              Перенести
            </button>
            <button className="button secondary" onClick={() => setSelected(null)}>
              Закрыть
            </button>
          </div>
        </div>
      ) : null}

      {dragMessage ? <p className="calendar-warning">{dragMessage}</p> : null}
      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}
    </section>
  );
}

function getHours() {
  return Array.from({ length: calendarHours.end - calendarHours.start }, (_, i) => calendarHours.start + i);
}

function getGridHeight() {
  return (calendarHours.end - calendarHours.start) * rowHeight;
}

function getTopOffset(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = calendarHours.start * 60;
  return ((minutes - startMinutes) / 60) * rowHeight;
}

function getHeight(start: Date, end: Date) {
  const duration = (end.getTime() - start.getTime()) / 60000;
  return (duration / 60) * rowHeight;
}

function formatDay(date: Date) {
  return `${date.getDate()}`;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function startOfWeek(date: Date) {
  const base = new Date(date);
  const day = base.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  base.setDate(base.getDate() + diff);
  base.setHours(0, 0, 0, 0);
  return base;
}

function addDays(date: Date, count: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function getWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function getMonthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBusyIntervals(
  appointments: CalendarAppointment[],
  day: Date,
  excludeId: string,
  barberId: string,
  totalMinutes: number
) {
  const dayStart = new Date(day);
  const intervals = appointments
    .filter((item) =>
      item.id !== excludeId &&
      item.barberId === barberId &&
      item.status !== 'cancelled' &&
      isSameDay(item.start, day)
    )
    .map((item) => {
      const startMin = Math.max(0, Math.floor((item.start.getTime() - dayStart.getTime()) / 60000));
      const endMin = Math.min(totalMinutes, Math.ceil((item.end.getTime() - dayStart.getTime()) / 60000));
      return { startMin, endMin };
    })
    .filter((interval) => interval.endMin > interval.startMin)
    .sort((a, b) => a.startMin - b.startMin);

  const merged: { startMin: number; endMin: number }[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (!last || interval.startMin > last.endMin) {
      merged.push({ ...interval });
    } else {
      last.endMin = Math.max(last.endMin, interval.endMin);
    }
  }
  return merged;
}

function findNearestAvailableStart(
  desiredStart: number,
  duration: number,
  busyIntervals: { startMin: number; endMin: number }[],
  maxStart: number,
  step: number
) {
  const isFree = (start: number) => {
    const end = start + duration;
    return busyIntervals.every((interval) => end <= interval.startMin || start >= interval.endMin);
  };

  if (isFree(desiredStart)) return desiredStart;

  const maxOffset = Math.max(desiredStart, maxStart - desiredStart);
  for (let offset = step; offset <= maxOffset; offset += step) {
    const earlier = desiredStart - offset;
    if (earlier >= 0 && isFree(earlier)) return earlier;
    const later = desiredStart + offset;
    if (later <= maxStart && isFree(later)) return later;
  }

  return null;
}

function formatRpcError(message: string) {
  if (message.includes('slot_taken')) {
    return 'Слот уже занят, выберите другое время';
  }
  if (message.includes('forbidden')) {
    return 'Нет прав на перенос записи';
  }
  if (message.includes('appointment_not_found')) {
    return 'Запись не найдена';
  }
  if (message.includes('outside_working_hours')) {
    return 'Время вне рабочего графика';
  }
  if (message.includes('barber_unavailable')) {
    return 'У мастера выходной или перерыв';
  }
  return message;
}

function shiftDate(
  direction: number,
  view: 'week' | 'month',
  setDate: Dispatch<SetStateAction<Date>>
) {
  setDate((prev) => {
    const next = new Date(prev);
    if (view === 'week') {
      next.setDate(prev.getDate() + direction * 7);
    } else {
      next.setMonth(prev.getMonth() + direction);
    }
    return next;
  });
}
