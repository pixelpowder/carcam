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

// Send a one-shot message to Claude. Returns the assistant's response text.
// Default model: Sonnet 4.5 (best quality / cost balance).
export async function chatOnce({
  messages,
  system,
  model = 'claude-sonnet-4-5-20250929',
  maxTokens = 16000,
}) {
  const auth = getAnthropicAuth();
  const headers = {
    'content-type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
  };
  if (auth.kind === 'oauth') {
    headers['authorization'] = `Bearer ${auth.token}`;
    // OAuth tokens require this beta header
    headers['anthropic-beta'] = 'oauth-2025-04-20';
  } else {
    headers['x-api-key'] = auth.token;
  }

  const body = {
    model,
    max_tokens: maxTokens,
    messages,
    ...(system ? { system } : {}),
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  // The response has content as an array of blocks; we want the first text block
  const text = (data.content || []).map(b => b.text || '').join('');
  return { text, usage: data.usage, authMode: auth.kind };
}
