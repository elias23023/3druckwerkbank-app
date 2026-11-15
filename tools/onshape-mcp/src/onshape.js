// Small client for the Onshape REST API, authenticated with API keys (Basic auth).
// Keys: https://dev-portal.onshape.com/keys

export class OnshapeError extends Error {
  constructor(status, message, body) {
    super(`Onshape ${status}: ${message}`);
    this.status = status;
    this.body = body;
  }
}

export class Onshape {
  constructor({ accessKey, secretKey, baseUrl = 'https://cad.onshape.com', apiVersion = 'v10' } = {}) {
    this.origin = new URL(baseUrl).origin;
    this.apiBase = `${this.origin}/api/${apiVersion}`;
    this.auth = accessKey && secretKey ? 'Basic ' + Buffer.from(`${accessKey}:${secretKey}`).toString('base64') : null;
  }

  url(path, query) {
    const u = new URL(this.apiBase + path);
    for (const [k, v] of Object.entries(query || {})) {
      if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    }
    return u;
  }

  async request(method, path, { query, body, accept = 'application/json', binary = false } = {}) {
    if (!this.auth) throw new Error('ONSHAPE_ACCESS_KEY und ONSHAPE_SECRET_KEY fehlen (siehe README).');
    let url = this.url(path, query);
    // Follow redirects by hand so the auth header only goes to Onshape itself.
    for (let hop = 0; hop < 5; hop++) {
      const headers = { Accept: accept };
      if (url.origin === this.origin) headers.Authorization = this.auth;
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'manual',
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        url = new URL(res.headers.get('location'), url);
        method = 'GET';
        body = undefined;
        continue;
      }
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try { msg = JSON.parse(text).message || text; } catch {}
        throw new OnshapeError(res.status, msg.slice(0, 2000), text);
      }
      if (binary) return Buffer.from(await res.arrayBuffer());
      if (res.status === 204) return null;
      const text = await res.text();
      if (!text) return null;
      try { return JSON.parse(text); } catch { return text; }
    }
    throw new Error('Zu viele Weiterleitungen');
  }

  get(path, query, opts) { return this.request('GET', path, { query, ...opts }); }
  post(path, body, query) { return this.request('POST', path, { body, query }); }
  delete(path, query) { return this.request('DELETE', path, { query }); }
}

// "w/<id>", "v/<id>" or "m/<id>" path segment. Writes only work in a workspace.
export function wvm({ workspaceId, versionId, microversionId }) {
  if (workspaceId) return `w/${workspaceId}`;
  if (versionId) return `v/${versionId}`;
  if (microversionId) return `m/${microversionId}`;
  throw new Error('workspaceId (oder versionId) fehlt');
}

// Accepts an Onshape document URL and pulls the ids out of it:
// https://cad.onshape.com/documents/<did>/w/<wid>/e/<eid>
export function parseOnshapeUrl(link) {
  const m = String(link).match(/documents\/([0-9a-f]{24})(?:\/([wvm])\/([0-9a-f]{24}))?(?:\/e\/([0-9a-f]{24}))?/i);
  if (!m) return null;
  const out = { documentId: m[1] };
  if (m[2] === 'w') out.workspaceId = m[3];
  if (m[2] === 'v') out.versionId = m[3];
  if (m[2] === 'm') out.microversionId = m[3];
  if (m[4]) out.elementId = m[4];
  return out;
}
