'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { createHandler } = require('../api/web-leads.js');
const id = '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794';
const env = { VERCEL_ENV: 'production', RESEND_API_KEY: 'mock-only-not-a-credential',
  CONTACT_FROM_EMAIL: 'website@example.com', CONTACT_TO_EMAIL: 'owner@example.com' };
const payload = () => ({ name: 'Synthetic Sender', email: 'sender@example.com', company: null,
  role: null, target_size: null, opt_in: false, topic: 'General question',
  message: 'Inquiry: Other\n\nSynthetic inquiry.', homepage: '', submission_id: id });
async function run({ body = payload(), raw, method = 'POST', headers = {}, config = env, provider,
  timeoutMs = 50 } = {}) {
  const calls = [], logs = [], responseHeaders = {};
  const req = Readable.from([Buffer.from(raw === undefined ? JSON.stringify(body) : raw)]);
  req.method = method;
  req.headers = { 'content-type': 'application/json', origin: 'https://www.landbasedstrategies.com', ...headers };
  const res = { setHeader(key, value) { responseHeaders[key] = value; }, end(value) { this.body = JSON.parse(value); } };
  const handler = createHandler({ env: config, timeoutMs, log: entry => logs.push(entry),
    fetchImpl: async (...args) => { calls.push(args); return provider ? provider(...args) : new Response(JSON.stringify({ id })); } });
  await handler(req, res);
  return { status: res.statusCode, body: res.body, headers: responseHeaders, calls, logs };
}

test('five public topics deliver one plain-text notification with safe Reply-To', async () => {
  for (const [label, topic] of [['Property opportunity', 'Sell-side opportunity'],
    ['Investment or development partnership', 'Partnership / JV'],
    ['Sponsor-led investment / LP opportunity', 'Partnership / JV'],
    ['Capital or lending relationship', 'General question'], ['Other', 'General question']]) {
    const result = await run({ body: { ...payload(), topic, message: `Inquiry: ${label}\n\nSynthetic inquiry.` } });
    assert.equal(result.status, 200);
    assert.equal(result.calls.length, 1);
    const [url, options] = result.calls[0];
    const mail = JSON.parse(options.body);
    assert.equal(url, 'https://api.resend.com/emails');
    assert.deepEqual(mail.to, ['owner@example.com']);
    assert.equal(mail.from, 'website@example.com');
    assert.equal(mail.reply_to, 'sender@example.com');
    assert.equal(mail.subject, `LBS inquiry: ${topic}`);
    assert(mail.text.includes(label));
    assert(!('html' in mail) && !('cc' in mail) && !('bcc' in mail));
    assert.equal(options.headers['Idempotency-Key'], `lbs-contact/${id}`);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(result.body.request_id, result.headers['X-Request-Id']);
    assert.equal(result.logs.at(-1).event, 'provider_accepted');
  }
});

test('existing payload without technical additions remains accepted', async () => {
  const body = payload(); delete body.homepage; delete body.submission_id;
  assert.equal((await run({ body })).status, 200);
});

test('invalid fields fail without calling Resend', async () => {
  const cases = [{ name: '' }, { name: 'x'.repeat(201) }, { name: 'a\nb' }, { name: {} },
    { email: 'a@example.com\r\nBcc: victim@example.com' }, { email: 'a@example.com,b@example.com' },
    { email: 'a@invalid' }, { email: 'a..b@example.com' }, { email: 'a@-bad.example' },
    { email: 'x'.repeat(255) }, { company: 'x'.repeat(301) }, { company: [] },
    { message: ' ' }, { message: 'x'.repeat(5201) }, { message: 'bad\0text' },
    { topic: 'Unapproved topic' }, { topic: {} }, { submission_id: 'not-a-uuid' }, { homepage: {} }];
  for (const patch of cases) {
    const result = await run({ body: { ...payload(), ...patch } });
    assert.equal(result.status, 400, Object.keys(patch).join());
    assert.equal(result.calls.length, 0);
  }
});

test('maximum lengths and multiline Unicode messages remain valid', async () => {
  const result = await run({ body: { ...payload(), name: 'N'.repeat(200), company: 'C'.repeat(300),
    message: 'Inquiry: Other\n\n' + '土'.repeat(5000) } });
  assert.equal(result.status, 200);
});

test('honeypot silently discards without delivery', async () => {
  const result = await run({ body: { ...payload(), homepage: 'spam' } });
  assert.equal(result.status, 200); assert.equal(result.calls.length, 0);
  assert.equal(result.logs.at(-1).event, 'spam_discarded');
});

test('method, content type, origin, JSON shape and body byte limits', async () => {
  for (const [options, status] of [[{ method: 'GET' }, 405], [{ method: 'OPTIONS' }, 405],
    [{ headers: { 'content-type': 'text/plain' } }, 415],
    [{ headers: { origin: 'https://attacker.example' } }, 403],
    [{ headers: { origin: 'http://127.0.0.1:8080' } }, 403],
    [{ raw: '{bad' }, 400], [{ body: [] }, 400], [{ body: null }, 400],
    [{ headers: { 'content-length': '32769' } }, 413], [{ raw: 'x'.repeat(32769) }, 413]]) {
    const result = await run(options); assert.equal(result.status, status); assert.equal(result.calls.length, 0);
  }
  assert.equal((await run({ headers: { 'content-type': 'application/json; charset=utf-8' } })).status, 200);
});

test('untrusted recipient and legacy fields cannot create an open relay', async () => {
  const result = await run({ body: { ...payload(), to: 'victim@example.com', from: 'forged@example.com',
    cc: 'victim@example.com', opt_in: true, role: 'ignored', target_size: 'ignored' } });
  assert.equal(result.status, 200);
  const mail = JSON.parse(result.calls[0][1].body);
  assert.deepEqual(mail.to, ['owner@example.com']); assert.equal(mail.from, 'website@example.com');
  assert(!JSON.stringify(mail).includes('victim@example.com'));
});

test('missing configuration and non-production environments fail closed', async () => {
  for (const patch of [{ RESEND_API_KEY: '' }, { CONTACT_FROM_EMAIL: '' }, { CONTACT_TO_EMAIL: 'invalid' },
    { VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'development' }, { VERCEL_ENV: undefined }]) {
    const result = await run({ config: { ...env, ...patch } });
    assert.equal(result.status, 503); assert.equal(result.calls.length, 0);
  }
});

test('provider errors, malformed acceptance, and outages never produce success or leak details', async () => {
  const providers = [() => new Response('private provider body', { status: 429 }),
    () => new Response('private provider body', { status: 401 }),
    () => new Response('private provider body', { status: 500 }),
    () => new Response('{}'), () => new Response('not-json'),
    () => new Response(JSON.stringify({ id: 'sender@example.com' })),
    () => { throw new Error('private exception detail'); }];
  for (const provider of providers) {
    const result = await run({ provider }); assert.equal(result.status, 503);
    const visible = JSON.stringify([result.body, result.logs]);
    for (const privateText of ['private', 'sender@example.com', 'Synthetic', env.RESEND_API_KEY]) assert(!visible.includes(privateText));
  }
});

test('provider timeout aborts the pending request', async () => {
  const result = await run({ timeoutMs: 5, provider: (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
  }) });
  assert.equal(result.status, 503); assert.equal(result.logs.at(-1).event, 'provider_timeout');
});

test('identical retries send identical provider bodies and idempotency keys', async () => {
  const a = await run(), b = await run();
  assert.equal(a.calls[0][1].body, b.calls[0][1].body);
  assert.equal(a.calls[0][1].headers['Idempotency-Key'], b.calls[0][1].headers['Idempotency-Key']);
  assert.notEqual(a.body.request_id, b.body.request_id);
});

test('successful application logs contain no inquiry PII', async () => {
  const result = await run(); const logs = JSON.stringify(result.logs);
  for (const text of ['Synthetic', 'sender@example.com', 'owner@example.com', 'website@example.com', env.RESEND_API_KEY]) {
    assert(!logs.includes(text));
  }
});
