import fetch from "node-fetch";
import FormData from "form-data";
import NodeCache from "node-cache";
import crypto from "crypto";

const cache = new NodeCache({ stdTTL: 60 * 60 });

const CONFIG = {
  remoteUploadEnabled: true,
  uploadUrl: process.env.PW_UPLOAD_URL || 'https://profitweb.tools/upload',
  uploadAuthHeader: process.env.PW_UPLOAD_AUTH || '',
  timeoutMs: 10000,
  maxRetries: 2
};

function hashBuffer(b) {
  return crypto.createHash('sha256').update(b).digest('hex');
}

async function remoteUploadCreative(buffer, filename = 'creative.bin') {
  const h = hashBuffer(buffer);
  const cached = cache.get(h);
  if (cached) return cached;

  const form = new FormData();
  form.append('file', buffer, { filename });

  let attempt = 0;
  while (attempt <= CONFIG.maxRetries) {
    attempt++;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

      const resp = await fetch(CONFIG.uploadUrl, {
        method: 'POST',
        headers: {
          ...(CONFIG.uploadAuthHeader ? { 'Authorization': CONFIG.uploadAuthHeader } : {}),
          ...form.getHeaders()
        },
        body: form,
        signal: controller.signal
      });

      clearTimeout(id);

      if (!resp.ok) {
        const txt = await resp.text();
        if (resp.status >= 500 && attempt <= CONFIG.maxRetries) {
          await new Promise(r => setTimeout(r, 300 * attempt));
          continue;
        }
        return { ok: false, error: `upload failed ${resp.status} ${txt}` };
      }

      const j = await resp.json().catch(() => null);
      if (!j) return { ok: false, error: 'no json' };
      const result = { ok: true, creativeId: j.creativeId || h, encryptedUrl: j.encryptedUrl || j.url, raw: j };
      cache.set(h, result);
      return result;

    } catch (err) {
      if (attempt <= CONFIG.maxRetries) {
        await new Promise(r => setTimeout(r, 200 * attempt));
        continue;
      }
      return { ok: false, error: err.message || 'timeout' };
    }
  }
  return { ok: false, error: 'max attempts' };
}

export default {
  check: async function(ctx) {
    try {
      if (!CONFIG.remoteUploadEnabled) return null;
      if (!ctx.creativeCandidate) return null;

      let buffer;
      if (Buffer.isBuffer(ctx.creativeCandidate)) {
        buffer = ctx.creativeCandidate;
      } else if (typeof ctx.creativeCandidate === 'string' && ctx.creativeCandidate.startsWith('data:')) {
        const b64 = ctx.creativeCandidate.split(',')[1];
        buffer = Buffer.from(b64, 'base64');
      } else {
        return null;
      }

      const up = await remoteUploadCreative(buffer, 'creative.bin');
      if (!up.ok) return null;

      return { action: 'transform', creativeId: up.creativeId, encryptedUrl: up.encryptedUrl, meta: up.raw };
    } catch (err) {
      console.error('[cloakerB] error', err);
      return null;
    }
  }
};
