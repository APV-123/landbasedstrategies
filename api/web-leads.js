'use strict';

const { randomUUID } = require('node:crypto');
const TOPICS = new Set(['Sell-side opportunity', 'Partnership / JV', 'General question']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY = 32 * 1024;
const CONTROL = /[\u0000-\u001f\u007f]/;

function email(value) {
  if (typeof value !== 'string' || value.length > 254 || CONTROL.test(value)) return false;
  const parts = value.split('@');
  return parts.length === 2 && parts[0].length <= 64 &&
    /^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/i.test(parts[0]) &&
    parts[1].includes('.') && parts[1].split('.').every(label =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}

function field(value, max, optional = false, multiline = false) {
  if (optional && (value === undefined || value === null)) return '';
  if (typeof value !== 'string' || value.length > max) throw new Error('validation');
  const invalid = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : CONTROL;
  if (invalid.test(value) || (!optional && !value.trim())) throw new Error('validation');
  return value.trim();
}

// Injection is used only by local tests; production always uses the fixed Resend URL.
function createHandler({ env = process.env, fetchImpl = globalThis.fetch,
  log = entry => console.info(JSON.stringify(entry)), timeoutMs = 10000 } = {}) {
  return async function handler(req, res) {
    const requestId = randomUUID();
    const started = Date.now();
    const record = (event, extra = {}) => log({ event, request_id: requestId, ...extra });
    const reply = (status, outcome, extra = {}) => {
      record(outcome, { status, duration_ms: Date.now() - started, ...extra });
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Request-Id', requestId);
      res.end(JSON.stringify(status === 200 ? { ok: true, request_id: requestId } :
        { ok: false, error: 'Unable to send inquiry.', request_id: requestId }));
    };
    record('received');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return reply(405, 'method_rejected');
    }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || '')) {
      return reply(415, 'content_type_rejected');
    }
    const origin = req.headers.origin;
    const localOrigin = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin || '');
    if (origin && origin !== 'https://www.landbasedstrategies.com' &&
      !(env.VERCEL_ENV !== 'production' && localOrigin)) return reply(403, 'origin_rejected');
    if (Number(req.headers['content-length']) > MAX_BODY) return reply(413, 'body_rejected');

    let body;
    try {
      // Read the stream directly so chunked bodies have the same byte limit.
      const chunks = [];
      let size = 0;
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.length;
        if (size > MAX_BODY) return reply(413, 'body_rejected');
        chunks.push(bytes);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('validation');
    } catch { return reply(400, 'body_rejected'); }

    let inquiry;
    try {
      const homepage = field(body.homepage, 2000, true);
      if (homepage) return reply(200, 'spam_discarded');
      const name = field(body.name, 200);
      const address = field(body.email, 254);
      if (!email(address) || !TOPICS.has(body.topic)) throw new Error('validation');
      const company = field(body.company, 300, true);
      // The browser adds the selected public topic label ahead of the user's 5,000 characters.
      const message = field(body.message, 5200, false, true);
      if (body.submission_id !== undefined &&
        (typeof body.submission_id !== 'string' || !UUID.test(body.submission_id))) throw new Error('validation');
      inquiry = { name, address, company, message, topic: body.topic,
        submissionId: body.submission_id || randomUUID() };
    } catch { return reply(400, 'validation_rejected'); }

    // No real delivery in Preview or local development, even if credentials leak into that scope.
    if (env.VERCEL_ENV !== 'production' || !env.RESEND_API_KEY ||
      !email(env.CONTACT_FROM_EMAIL) || !email(env.CONTACT_TO_EMAIL)) return reply(503, 'configuration_unavailable');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json',
          'Idempotency-Key': `lbs-contact/${inquiry.submissionId}` },
        body: JSON.stringify({ from: env.CONTACT_FROM_EMAIL, to: [env.CONTACT_TO_EMAIL],
          reply_to: inquiry.address, subject: `LBS inquiry: ${inquiry.topic}`,
          text: `Name: ${inquiry.name}\nEmail: ${inquiry.address}\nCompany or role: ${inquiry.company || '(not supplied)'}\n\n${inquiry.message}` })
      });
      if (!response.ok) return reply(503, 'provider_rejected', { provider_status: response.status });
      const result = await response.json();
      if (!result || typeof result.id !== 'string' || !UUID.test(result.id)) return reply(503, 'provider_invalid_response');
      return reply(200, 'provider_accepted', { provider_id: result.id, submission_id: inquiry.submissionId });
    } catch {
      return reply(503, controller.signal.aborted ? 'provider_timeout' : 'provider_unavailable');
    } finally { clearTimeout(timer); }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
