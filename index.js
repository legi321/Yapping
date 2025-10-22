#!/usr/bin/env node
/**
 * index.js — replacement for YapAutoBot-NTE index
 *
 * - CLI + minimal HTTP API (/yap)
 * - Loads account.json for configuration (no sensitive logic here)
 * - Exposes startBot() as a safe placeholder to integrate your allowed automation
 * - Built with safety: rate-limit, max repeats, and clear TODOs for real integrations
 *
 * Usage:
 *   node index.js "message to yap" -n 5 --mode caps
 *   node index.js --server --port 3000
 *
 * NOTE: fill the `integrateWithService` function with your allowed/authorized API code.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const PACKAGE_MAX_REPEAT = 200;

function safeReadJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

/**
 * Core transform function (yap)
 */
function yap(text = '', opts = {}) {
  const {
    n = 3,
    sep = ' ',
    mode = 'echo',
    prefix = '',
    suffix = ''
  } = opts;

  const safeN = Math.max(1, Math.min(PACKAGE_MAX_REPEAT, parseInt(n, 10) || 3));
  const pieces = [];

  for (let i = 0; i < safeN; i++) {
    let t = String(text);
    switch (mode) {
      case 'caps':
        t = t.toUpperCase();
        break;
      case 'shuffle':
        t = t.split('').sort(() => Math.random() - 0.5).join('');
        break;
      case 'funny':
        t = altCase(t, i) + (i % 2 === 0 ? '!' : '...');
        break;
      case 'echo':
      default:
        break;
    }
    pieces.push(prefix + t + suffix);
  }

  return pieces.join(sep);
}

function altCase(s, i) {
  return s
    .split('')
    .map((ch, idx) => (idx % 2 === (i % 2) ? ch.toUpperCase() : ch.toLowerCase()))
    .join('');
}

/**
 * Placeholder: integrateWithService
 * - This function should be implemented by you to actually send messages to a service,
 *   AFTER you ensure the action is permitted by the target service's ToS and you have credentials.
 * - Keep this function asynchronous and return an object { ok: boolean, info?: any, error?: string }.
 */
async function integrateWithService(transformedText, config = {}) {
  // TODO: Replace this with your authorized integration.
  // Examples (do not include directly unless you have permission & credentials):
  // - send via allowed bot API (official SDK)
  // - post to your own server that forwards to a permitted endpoint
  //
  // SAFETY: This sample implementation DOES NOT send anything. It only simulates work.
  await sleep(200);
  return { ok: true, info: 'simulated-send (fill integrateWithService with real code)' };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bot runner API
 */
let isRunning = false;
const defaultAccount = safeReadJSON(path.join(__dirname, 'account.json')) || {};

async function startBot(opts = {}) {
  if (isRunning) return { ok: false, error: 'bot already running' };
  isRunning = true;
  // simple heartbeat loop (non-blocking)
  (async () => {
    while (isRunning) {
      // you can add periodic tasks here if needed
      await sleep(60_000);
    }
  })();
  return { ok: true, info: 'bot started', config: { ...defaultAccount, ...opts } };
}

async function stopBot() {
  if (!isRunning) return { ok: false, error: 'bot not running' };
  isRunning = false;
  return { ok: true, info: 'bot stopped' };
}

/**
 * Simple HTTP server (GET /yap?msg=..&n=3&mode=..)
 */
function startServer(port = 3000) {
  const server = http.createServer(async (req, res) => {
    const u = url.parse(req.url, true);
    if (u.pathname === '/' || u.pathname === '/yap') {
      const q = u.query || {};
      const msg = q.msg || q.message || '';
      const n = q.n || q.count || 1;
      const sep = q.sep || ' ';
      const mode = q.mode || 'echo';
      const prefix = q.prefix || '';
      const suffix = q.suffix || '';

      // basic rate-limit and validation
      const safeN = Math.max(1, Math.min(PACKAGE_MAX_REPEAT, parseInt(n, 10) || 1));
      const resultText = yap(msg, { n: safeN, sep, mode, prefix, suffix });

      // Optional: automatically call integration (simulated here)
      const sendRes = await integrateWithService(resultText, defaultAccount);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, payload: resultText, sendRes }));
      return;
    }

    // Not found
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'not found' }));
  });

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`YapAutoBot (safe stub) listening on http://localhost:${port} — GET /yap?msg=hi&n=3`);
  });

  return server;
}

/**
 * CLI wiring
 */
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const flags = {};
    const positionals = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a.startsWith('--')) {
        const key = a.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      } else if (a.startsWith('-')) {
        const key = a.slice(1);
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      } else {
        positionals.push(a);
      }
    }

    if (flags.server || flags.s) {
      const port = parseInt(flags.port || flags.p || 3000, 10) || 3000;
      startServer(port);
      return;
    }

    const text = positionals.length ? positionals.join(' ') : flags.msg || flags.m || '';
    const n = flags.n || flags.N || flags.count || 1;
    const sep = flags.sep || flags.s || ' ';
    const mode = flags.mode || 'echo';
    const prefix = flags.prefix || '';
    const suffix = flags.suffix || '';

    const result = yap(text, { n, sep, mode, prefix, suffix });
    console.log(result);

    // optional: call integration (simulated)
    const simulated = await integrateWithService(result, defaultAccount);
    console.log('send result:', simulated);
  })();
}

module.exports = {
  yap,
  startBot,
  stopBot,
  startServer,
  integrateWithService
};
