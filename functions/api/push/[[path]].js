export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Отдача публичного VAPID-ключа для фронтенда
  if (url.pathname === '/api/push/vapid-public-key' && request.method === 'GET') {
    return new Response(JSON.stringify({ key: env.VAPID_PUBLIC }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 2. Сохранение подписки пользователя
  if (url.pathname === '/api/push/subscribe' && request.method === 'POST') {
    try {
      const { subscription, userId, prefs } = await request.json();
      
      const response = await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          prefs: prefs || { items: true, requests: true, lang: 'ru' }
        })
      });

      if (!response.ok) throw new Error(await response.text());

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  // 3. Обработка вебхука от Supabase и рассылка пушей
  if (url.pathname === '/api/push/webhook' && request.method === 'POST') {
    const secret = request.headers.get('X-Webhook-Secret');
    if (secret !== env.WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const payload = await request.json();
      const { type, table, record } = payload;

      if (type === 'INSERT') {
        console.log(`Новая запись в ${table}:`, record);
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response('Sosed PWA Backend is running!', { status: 200 });
}
