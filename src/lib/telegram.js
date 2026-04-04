const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Send a message to the authorized chat
export async function sendMessage(text, opts = {}) {
  const body = {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'HTML',
    ...opts,
  };
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Check if a message is from the authorized user
export function isAuthorized(update) {
  const chatId = String(update?.message?.chat?.id || update?.callback_query?.message?.chat?.id || '');
  return chatId === CHAT_ID;
}

// Format a number with commas
export function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

// Format position
export function fmtPos(n) {
  return (n || 0).toFixed(1);
}

// Score color emoji
export function scoreEmoji(score) {
  if (score >= 70) return '🟢';
  if (score >= 40) return '🟡';
  return '🔴';
}

// Trend arrow
export function trend(current, previous) {
  if (!previous) return '';
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return '➡️';
  return diff > 0 ? '📈' : '📉';
}
