// Minimal Anthropic Messages API client.
//
// Auth: ANTHROPIC_API_KEY (sk-ant-api03-... from console.anthropic.com).
// Per-token billing.
//
// Note: an earlier version supported CLAUDE_CODE_OAUTH_TOKEN as a free
// alternative routed through the user's Pro/Max subscription. Anthropic
// closed that path — OAuth tokens are scoped to the Claude Code CLI client
// only and the public Messages API rejects them with 401. Removed in favour
// of a single supported auth path.

const ANTHROPIC_VERSION = '2023-06-01';
const API_URL = 'https://api.anthropic.com/v1/messages';

function getApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY env var not set. Add it in Vercel project settings (sk-ant-api03-... from console.anthropic.com).');
  return apiKey;
}

async function callOnce({ model, maxTokens, messages, system }) {
  const body = {
    model,
    max_tokens: maxTokens,
    messages,
    ...(system ? { system } : {}),
  };
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
      'x-api-key': getApiKey(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Anthropic API ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.bodyText = text;
    throw err;
  }
  const data = await res.json();
  return { text: (data.content || []).map(b => b.text || '').join(''), usage: data.usage };
}

// Send a one-shot message to Claude. Returns { text, usage, authMode }.
// authMode is always 'apiKey' now — kept for back-compat with callers that
// still display it in the UI.
export async function chatOnce({
  messages,
  system,
  model = 'claude-sonnet-4-5-20250929',
  maxTokens = 16000,
}) {
  const r = await callOnce({ model, maxTokens, messages, system });
  return { ...r, authMode: 'apiKey', fallback: false };
}
