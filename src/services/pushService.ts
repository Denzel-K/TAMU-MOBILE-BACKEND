export interface ExpoPushMessage {
  to: string | string[];
  sound?: 'default' | null;
  title?: string;
  body?: string;
  data?: Record<string, any>;
  priority?: 'default' | 'normal' | 'high';
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendExpoPushAsync(message: ExpoPushMessage) {
  const body = Array.isArray(message.to)
    ? message.to.map((to) => ({
        to,
        sound: message.sound ?? 'default',
        title: message.title,
        body: message.body,
        data: message.data,
        priority: message.priority ?? 'high',
      }))
    : [{
        to: message.to,
        sound: message.sound ?? 'default',
        title: message.title,
        body: message.body,
        data: message.data,
        priority: message.priority ?? 'high',
      }];

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Expo push error: ${res.status} ${res.statusText} - ${JSON.stringify(json)}`);
  }
  return json;
}
