import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { randomBytes } from 'node:crypto'

async function availablePort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

async function withServer(password, check) {
  const port = await availablePort()
  const base = `http://127.0.0.1:${port}`
  const env = { ...process.env, PERSONAL_APP_PASSWORD: password }
  // Smoke tests must never connect to the owner's messaging or AI accounts.
  for (const key of Object.keys(env)) {
    if (/^(ANTHROPIC_|GMAIL_|SLACK_|TWILIO_)/.test(key)) delete env[key]
  }
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  server.stdout.on('data', chunk => { output += chunk })
  server.stderr.on('data', chunk => { output += chunk })
  try {
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error(`Server exited: ${output}`)
      try { await fetch(`${base}/robots.txt`); ready = true; break } catch { await new Promise(r => setTimeout(r, 100)) }
    }
    assert.ok(ready, 'Production server starts')
    await check(base)
  } finally {
    server.kill('SIGTERM')
    if (server.exitCode === null) await once(server, 'exit')
  }
}

const password = randomBytes(24).toString('hex')
await withServer(password, async base => {
  for (const route of ['/', '/personalapp/index.html', '/api/claude', '/api/news', '/api/gmail/status', '/api/slack/channels', '/api/auth/gmail/callback']) {
    const response = await fetch(base + route)
    assert.equal(response.status, 401, `${route} requires authentication`)
  }
  const invalid = await fetch(base, { headers: { Authorization: `Basic ${Buffer.from('owner:incorrect').toString('base64')}` } })
  assert.equal(invalid.status, 401, 'An incorrect password is rejected')
  const headers = { Authorization: `Basic ${Buffer.from(`owner:${password}`).toString('base64')}` }
  const home = await fetch(base, { headers })
  assert.equal(home.status, 200, 'The app runs at the site root')
  const html = await home.text()
  assert.ok(html.includes('<title>Personal App — Nexus</title>'))
  assert.ok(html.includes('Create a 4-digit PIN for this device'))
  assert.ok(home.headers.get('cache-control')?.includes('no-store'))
  const legacy = await fetch(`${base}/personalapp`, { headers, redirect: 'manual' })
  assert.ok([307, 308].includes(legacy.status), 'The legacy path redirects to the root')
  const status = await fetch(`${base}/api/gmail/status`, { headers })
  assert.deepEqual(await status.json(), { connected: false }, 'Missing credentials do not contact Gmail')
  const ai = await fetch(`${base}/api/claude`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' })
  assert.equal(ai.status, 500, 'AI reports missing configuration without calling a provider')
  const webhook = await fetch(`${base}/api/whatsapp/incoming`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'Body=smoke-test' })
  assert.equal(webhook.status, 403, 'An unsigned webhook is rejected without contacting Twilio')
})

await withServer('', async base => {
  const response = await fetch(base)
  assert.equal(response.status, 503, 'The app stays closed until an access password is configured')
})
console.log('Passed: production root, protected APIs, device PIN setup, legacy redirect, configuration handling, and webhook authentication.')
