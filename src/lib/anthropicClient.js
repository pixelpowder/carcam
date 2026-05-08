// Minimal Anthropic Messages API client that supports two auth modes:
//   - CLAUDE_CODE_OAUTH_TOKEN  (sk-ant-oat... — counts against Claude Pro/Max
//                               subscription quota, no per-token API billing)
//   - ANTHROPIC_API_KEY        (sk-ant-api... — billed per token)
//
// To get an OAuth token: run `claude setup-token` in your terminal (requires
// Claude Code CLI installed and a logged-in Claude.com account). It outputs
// a long-lived token. Add as CLAUDE_CODE_OAUTH_TOKEN in Vercel env.
//
// If both are set, OAuth wins (cheaper). If neither, throws.

const ANTHROPIC_VERSION = '2023-06-01';
const API_URL = 'https://api.anthropic.com/v1/messages';

export function getAnthropicAuth() {
  const oauth = process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim();
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (oauth) return { kind: 'oauth', token: oauth };
  if (apiKey) return { kind: 'apiKey', token: apiKey };
  throw new Error('No Anthropic credentials configured. Set CLAUDE_CODE_OAUTH_TOKEN (free, uses Pro/Max subscription) or ANTHROPIC_API_KEY (per-token billing).');
}

function buildHeaders(auth) {
  const headers = {
    'content-type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
  };
  if (auth.kind === 'oauth') {
    headers['authorization'] = `Bearer ${auth.token}`;
    headers['anthropic-beta'] = 'oauth-2025-04-20';
  } else {
    headers['x-api-key'] = auth.token;
  }
  return headers;
}

async function callOnce({ auth, model, maxTokens, messages, system }) {
  const body = {
    model,
    max_tokens: maxTokens,
    messages,
    ...(system ? { system } : {}),
  };
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: buildHeaders(auth),
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

// Send a one-shot message to Claude. If OAuth is configured AND ANTHROPIC_API_KEY
// is also set, OAuth is tried first and on 429 (rate limit) we fall back to the
// API key automatically. Caller sees this via response.fallback = true.
export async function chatOnce({
  messages,
  system,
  model = 'claude-sonnet-4-5-20250929',
  maxTokens = 16000,
}) {
  const oauth = process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim();
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!oauth && !apiKey) throw new Error('No Anthropic credentials configured.');

  // Prefer OAuth (free, subscription quota)
  if (oauth) {
    try {
      const r = await callOnce({ auth: { kind: 'oauth', token: oauth }, model, maxTokens, messages, system });
      return { ...r, authMode: 'oauth', fallback: false };
    } catch (e) {
      // Only fall back to API key on rate-limit (429). Other errors should bubble.
      if (e.status === 429 && apiKey) {
        try {
          const r = await callOnce({ auth: { kind: 'apiKey', token: apiKey }, model, maxTokens, messages, system });
          return { ...r, authMode: 'apiKey', fallback: true, fallbackReason: 'OAuth rate-limited (429), used API key' };
        } catch (e2) {
          throw e2;
        }
      }
      throw e;
    }
  }

  // OAuth not set — use API key directly
  const r = await callOnce({ auth: { kind: 'apiKey', token: apiKey }, model, maxTokens, messages, system });
  return { ...r, authMode: 'apiKey', fallback: false };
}
