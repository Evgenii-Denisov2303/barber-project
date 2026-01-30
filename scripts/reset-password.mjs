import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const newPassword = process.argv[3];

if (!supabaseUrl || !serviceKey) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.'
  );
  process.exit(1);
}

if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-password.mjs <email> <newPassword>');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

try {
  const targetEmail = email.toLowerCase();
  const perPage = 200;
  let page = 1;
  let user = null;

  while (true) {
    const { data: listData, error: listError } =
      await adminClient.auth.admin.listUsers({ page, perPage });
    if (listError) {
      console.error('Failed to list users:', listError.message);
      process.exit(1);
    }
    const users = listData?.users ?? [];
    user = users.find(
      (candidate) => candidate.email?.toLowerCase() === targetEmail
    );
    if (user) break;
    if (users.length < perPage) break;
    page += 1;
  }

  if (!user) {
    console.error('No user found for that email.');
    process.exit(1);
  }

  const { error: updateError } =
    await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword
    });
  if (updateError) {
    console.error('Failed to update password:', updateError.message);
    process.exit(1);
  }

  console.log(`Password updated for ${email}.`);
} catch (err) {
  console.error('Unexpected error:', err instanceof Error ? err.message : err);
  process.exit(1);
}
