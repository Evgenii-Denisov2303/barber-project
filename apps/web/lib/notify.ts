import { supabaseBrowser } from './supabaseBrowser';

type NotifyEvent = 'created' | 'rescheduled' | 'cancelled' | 'confirmed' | 'status';

export async function notifyTelegram(appointmentId: string, event: NotifyEvent) {
  if (!supabaseBrowser) return;
  try {
    const { error } = await supabaseBrowser.functions.invoke('notify-telegram', {
      body: { appointmentId, event }
    });
    if (error) {
      console.warn('notify-telegram', error.message);
    }
  } catch (err) {
    console.warn('notify-telegram', err);
  }
}
