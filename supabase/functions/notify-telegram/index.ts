import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const eventLabels: Record<string, string> = {
  created: 'Новая запись',
  rescheduled: 'Запись перенесена',
  cancelled: 'Запись отменена',
  confirmed: 'Запись подтверждена',
  status: 'Обновление записи'
};

const defaultTelegramTemplate = [
  '🗓 {event}',
  'Время: {datetime}',
  'Услуга: {service}',
  'Мастер: {barber}',
  'Клиент: {client}',
  'Телефон: {client_phone}',
  'Салон: {location}',
  'Адрес: {address}'
].join('\n');

const defaultSmsTemplate = '{event} · {date} {time} · {service} · {barber}';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { appointmentId, event } = await req.json();
    if (!appointmentId || !event) {
      return jsonResponse({ error: 'missing_params' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse({ error: 'missing_env' }, 500);
    }

    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader) {
      return jsonResponse({ error: 'missing_auth' }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    const { data: appointment, error: appointmentError } = await adminClient
      .from('appointments')
      .select('id, barber_id, start_at, status, note, location_id, services(name), barbers(telegram_chat_id, telegram_enabled, users(full_name)), users(full_name, phone)')
      .eq('id', appointmentId)
      .maybeSingle();

    if (appointmentError || !appointment) {
      return jsonResponse({ error: 'appointment_not_found' }, 404);
    }

    if (!appointment.location_id) {
      return jsonResponse({ ok: true, skipped: 'no_location' });
    }

    const { data: location } = await adminClient
      .from('locations')
      .select('name, address, phone, timezone')
      .eq('id', appointment.location_id)
      .maybeSingle();

    const { data: settings } = await adminClient
      .from('notification_settings')
      .select('telegram_enabled, telegram_chat_id, telegram_template, sms_enabled, sms_sender, sms_template')
      .eq('location_id', appointment.location_id)
      .maybeSingle();

    if (!settings) {
      return jsonResponse({ error: 'settings_not_found' }, 404);
    }

    const barberChatId = appointment.barbers?.telegram_chat_id ?? '';
    const barberTelegramEnabled = Boolean(appointment.barbers?.telegram_enabled && barberChatId);
    const locationTelegramEnabled = Boolean(settings.telegram_enabled && settings.telegram_chat_id);
    const smsEnabled = Boolean(settings.sms_enabled && settings.sms_sender);

    if (!locationTelegramEnabled && !barberTelegramEnabled && !smsEnabled) {
      return jsonResponse({ ok: true, skipped: 'notifications_disabled' });
    }

    const startAt = new Date(appointment.start_at);
    const timezone = location?.timezone ?? 'Europe/Moscow';
    const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone
    });
    const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });
    const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });

    const context = {
      event: eventLabels[event] ?? eventLabels.status,
      date: dateFormatter.format(startAt),
      time: timeFormatter.format(startAt),
      datetime: dateTimeFormatter.format(startAt),
      service: appointment.services?.name ?? 'Услуга',
      barber: appointment.barbers?.users?.full_name ?? 'Мастер',
      client: appointment.users?.full_name ?? 'Клиент',
      client_phone: appointment.users?.phone ?? '',
      location: location?.name ?? 'Istanbul',
      address: location?.address ?? '',
      location_phone: location?.phone ?? '',
      status: appointment.status ?? ''
    };

    const telegramTemplate = (settings.telegram_template ?? '').trim() || defaultTelegramTemplate;
    const telegramMessage = renderTemplate(telegramTemplate, context);
    const smsTemplate = (settings.sms_template ?? '').trim() || defaultSmsTemplate;
    const smsMessage = sanitizeSms(renderTemplate(smsTemplate, context));
    const logBase = {
      location_id: appointment.location_id ?? null,
      appointment_id: appointment.id ?? null,
      barber_id: appointment.barber_id ?? null
    };

    const results: Record<string, string> = {};
    const errors: string[] = [];

    if (locationTelegramEnabled || barberTelegramEnabled) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        errors.push('telegram_missing_token');
        if (locationTelegramEnabled) {
          await logNotification(adminClient, {
            ...logBase,
            channel: 'telegram_admin',
            recipient: settings.telegram_chat_id ?? null,
            status: 'error',
            detail: 'missing_bot_token',
            meta: { event: context.event, message: telegramMessage }
          });
        }
        if (barberTelegramEnabled) {
          await logNotification(adminClient, {
            ...logBase,
            channel: 'telegram_barber',
            recipient: barberChatId ?? null,
            status: 'error',
            detail: 'missing_bot_token',
            meta: { event: context.event, message: telegramMessage }
          });
        }
      } else {
        if (locationTelegramEnabled && settings.telegram_chat_id) {
          const response = await sendTelegram(botToken, settings.telegram_chat_id, telegramMessage);
          if (!response.ok) {
            errors.push(`telegram_admin_error:${response.detail}`);
            await logNotification(adminClient, {
              ...logBase,
              channel: 'telegram_admin',
              recipient: settings.telegram_chat_id,
              status: 'error',
              detail: response.detail,
              meta: { event: context.event, message: telegramMessage }
            });
          } else {
            results.telegram_admin = 'sent';
            await logNotification(adminClient, {
              ...logBase,
              channel: 'telegram_admin',
              recipient: settings.telegram_chat_id,
              status: 'sent',
              meta: { event: context.event, message: telegramMessage }
            });
          }
        }

        if (barberTelegramEnabled && barberChatId) {
          if (!settings.telegram_chat_id || barberChatId !== settings.telegram_chat_id) {
            const response = await sendTelegram(botToken, barberChatId, telegramMessage);
            if (!response.ok) {
              errors.push(`telegram_barber_error:${response.detail}`);
              await logNotification(adminClient, {
                ...logBase,
                channel: 'telegram_barber',
                recipient: barberChatId,
                status: 'error',
                detail: response.detail,
                meta: { event: context.event, message: telegramMessage }
              });
            } else {
              results.telegram_barber = 'sent';
              await logNotification(adminClient, {
                ...logBase,
                channel: 'telegram_barber',
                recipient: barberChatId,
                status: 'sent',
                meta: { event: context.event, message: telegramMessage }
              });
            }
          } else {
            results.telegram_barber = 'skipped_duplicate';
            await logNotification(adminClient, {
              ...logBase,
              channel: 'telegram_barber',
              recipient: barberChatId,
              status: 'skipped',
              detail: 'duplicate_chat_id',
              meta: { event: context.event, message: telegramMessage }
            });
          }
        }
      }
    }

    if (smsEnabled) {
      const smsKey = Deno.env.get('MTS_EXOLVE_API_KEY');
      if (!smsKey) {
        errors.push('sms_missing_api_key');
        await logNotification(adminClient, {
          ...logBase,
          channel: 'sms',
          recipient: appointment.users?.phone ?? null,
          status: 'error',
          detail: 'missing_api_key',
          meta: { event: context.event, message: smsMessage }
        });
      } else if (!settings.sms_sender) {
        errors.push('sms_missing_sender');
        await logNotification(adminClient, {
          ...logBase,
          channel: 'sms',
          recipient: appointment.users?.phone ?? null,
          status: 'error',
          detail: 'missing_sender',
          meta: { event: context.event, message: smsMessage }
        });
      } else {
        const destination = normalizePhone(appointment.users?.phone ?? '');
        if (!destination) {
          results.sms = 'skipped_no_phone';
          await logNotification(adminClient, {
            ...logBase,
            channel: 'sms',
            recipient: appointment.users?.phone ?? null,
            status: 'skipped',
            detail: 'missing_phone',
            meta: { event: context.event, message: smsMessage }
          });
        } else {
          const smsResponse = await fetch('https://api.exolve.ru/messaging/v1/SendSMS', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${smsKey}`
            },
            body: JSON.stringify({
              number: settings.sms_sender,
              destination,
              text: smsMessage
            })
          });

          if (!smsResponse.ok) {
            const detail = await smsResponse.text();
            errors.push(`sms_error:${detail}`);
            await logNotification(adminClient, {
              ...logBase,
              channel: 'sms',
              recipient: destination,
              status: 'error',
              detail,
              meta: { event: context.event, message: smsMessage }
            });
          } else {
            results.sms = 'sent';
            await logNotification(adminClient, {
              ...logBase,
              channel: 'sms',
              recipient: destination,
              status: 'sent',
              meta: { event: context.event, message: smsMessage }
            });
          }
        }
      }
    }

    if (errors.length > 0) {
      return jsonResponse({ ok: false, results, errors }, 500);
    }

    return jsonResponse({ ok: true, results });
  } catch (err) {
    return jsonResponse({ error: 'unexpected_error', detail: String(err) }, 500);
  }
});

function renderTemplate(template: string, context: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? '');
}

function sanitizeSms(text: string) {
  return text.replace(/\s*\n\s*/g, ' · ').replace(/\s+/g, ' ').trim();
}

async function sendTelegram(botToken: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, detail };
  }
  return { ok: true, detail: '' };
}

function normalizePhone(input: string) {
  const digits = input.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `7${digits}`;
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return digits;
  return digits;
}

async function logNotification(
  client: ReturnType<typeof createClient>,
  payload: {
    location_id: string | null;
    appointment_id: string | null;
    barber_id: string | null;
    channel: string;
    recipient?: string | null;
    status: 'sent' | 'error' | 'skipped';
    detail?: string | null;
    meta?: Record<string, unknown>;
  }
) {
  try {
    await client.from('notification_logs').insert({
      location_id: payload.location_id,
      appointment_id: payload.appointment_id,
      barber_id: payload.barber_id,
      channel: payload.channel,
      recipient: payload.recipient ?? null,
      status: payload.status,
      detail: payload.detail ?? null,
      meta: payload.meta ?? null
    });
  } catch (_) {
    // logging is best-effort
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
