const TOKEN_KEY = 'nakpark_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

async function request(method, url, body, raw = false) {
  const res = await fetch(`/api${url}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && getToken()) onUnauthorized();
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* sin cuerpo */ }
    throw new Error(msg);
  }
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (u) => request('GET', u),
  post: (u, b) => request('POST', u, b ?? {}),
  put: (u, b) => request('PUT', u, b ?? {}),
  del: (u) => request('DELETE', u),
};

/** Abre un PDF protegido (necesita el token) en una pestaña nueva. */
export async function openPdf(url) {
  const tab = window.open('', '_blank'); // se abre en el clic para que no lo bloquee el navegador
  try {
    const blob = await (await request('GET', url, null, true)).blob();
    const objUrl = URL.createObjectURL(blob);
    if (tab) tab.location.href = objUrl; else window.location.href = objUrl;
  } catch (e) {
    tab?.close();
    throw e;
  }
}

export async function downloadFile(url, filename) {
  const blob = await (await request('GET', url, null, true)).blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const TZ = 'America/Lima';
export const fmtFecha = (d) =>
  d ? new Intl.DateTimeFormat('es-PE', { timeZone: TZ, dateStyle: 'short', timeStyle: 'medium', hourCycle: 'h23' }).format(new Date(d)) : '';
export const money = (n) => `S/. ${Number(n ?? 0).toFixed(2)}`;
