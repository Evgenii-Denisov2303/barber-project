import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const defaultTelegramTemplate = [
  '🧪 {event}',
  'Салон: {location}',
  'Время: {datetime}'
].join('\n');

const defaultSmsTemplate = 'Тест уведомлений · {location} · {date} {time}';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { channel, phone, locationId } = await req.json();
    if (!locationId) {
      return jsonResponse({ error: 'missing_location' }, 400);
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

    const { data: settings } = await adminClient
      .from('notification_settings')
      .select('telegram_enabled, telegram_chat_id, telegram_template, sms_enabled, sms_sender, sms_template')
      .eq('location_id', locationId)
      .maybeSingle();

    const { data: location } = await adminClient
      .from('locations')
      .select('name, timezone')
      .eq('id', locationId)
      .maybeSingle();

    if (!settings) {
      return jsonResponse({ error: 'settings_not_found' }, 404);
    }

    const mode = channel ?? 'telegram';
    const results: Record<string, string> = {};
    const errors: string[] = [];

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

    const now = new Date();
    const context = {
      event: 'Тест уведомлений',
      date: dateFormatter.format(now),
      time: timeFormatter.format(now),
      datetime: dateTimeFormatter.format(now),
      service: 'Мужская стрижка',
      barber: 'Тестовый мастер',
      client: authData.user?.email ?? 'Клиент',
      client_phone: phone ?? '',
      location: location?.name ?? 'Istanbul',
      address: '',
      location_phone: '',
      status: 'pending'
    };

    const telegramTemplate = (settings.telegram_template ?? '').trim() || defaultTelegramTemplate;
    const telegramMessage = renderTemplate(telegramTemplate, context);
    const smsTemplate = (settings.sms_template ?? '').trim() || defaultSmsTemplate;
    const smsMessage = sanitizeSms(renderTemplate(smsTemplate, context));
    const logBase = {
      location_id: locationId ?? null,
      appointment_id: null,
      barber_id: null
    };

    if (mode === 'telegram' || mode === 'all') {
      if (!settings.telegram_enabled || !settings.telegram_chat_id) {
        results.telegram = 'skipped_disabled';
        await logNotification(adminClient, {
          ...logBase,
          channel: 'test_telegram',
          recipient: settings.telegram_chat_id ?? null,
          status: 'skipped',
          detail: 'disabled',
          meta: { event: context.event, message: telegramMessage }
        });
      } else {
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (!botToken) {
          errors.push('telegram_missing_token');
          await logNotification(adminClient, {
            ...logBase,
            channel: 'test_telegram',
            recipient: settings.telegram_chat_id ?? null,
            status: 'error',
            detail: 'missing_bot_token',
            meta: { event: context.event, message: telegramMessage }
          });
        } else {
          const response = await sendTelegram(botToken, settings.telegram_chat_id, telegramMessage);
          if (!response.ok) {
            errors.push(`telegram_error:${response.detail}`);
            await logNotification(adminClient, {
              ...logBase,
              channel: 'test_telegram',
              recipient: settings.telegram_chat_id ?? null,
              status: 'error',
              detail: response.detail,
              meta: { event: context.event, message: telegramMessage }
            });
          } else {
            results.telegram = 'sent';
            await logNotification(adminClient, {
              ...logBase,
              channel: 'test_telegram',
              recipient: settings.telegram_chat_id ?? null,
              status: 'sent',
              meta: { event: context.event, message: telegramMessage }
            });
          }
        }
      }
    }

    if (mode === 'sms' || mode === 'all') {
      if (!settings.sms_enabled || !settings.sms_sender) {
        results.sms = 'skipped_disabled';
        await logNotification(adminClient, {
          ...logBase,
          channel: 'test_sms',
          recipient: phone ?? null,
          status: 'skipped',
          detail: 'disabled',
          meta: { event: context.event, message: smsMessage }
        });
      } else {
        const smsKey = Deno.env.get('MTS_EXOLVE_API_KEY');
        if (!smsKey) {
          errors.push('sms_missing_api_key');
          await logNotification(adminClient, {
            ...logBase,
            channel: 'test_sms',
            recipient: phone ?? null,
            status: 'error',
            detail: 'missing_api_key',
            meta: { event: context.event, message: smsMessage }
          });
        } else {
          const destination = normalizePhone(phone ?? '');
          if (!destination) {
            errors.push('sms_missing_phone');
            await logNotification(adminClient, {
              ...logBase,
              channel: 'test_sms',
              recipient: phone ?? null,
              status: 'error',
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
                channel: 'test_sms',
                recipient: destination,
                status: 'error',
                detail,
                meta: { event: context.event, message: smsMessage }
              });
            } else {
              results.sms = 'sent';
              await logNotification(adminClient, {
                ...logBase,
                channel: 'test_sms',
                recipient: destination,
                status: 'sent',
                meta: { event: context.event, message: smsMessage }
              });
            }
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
      text
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
  return null;
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
