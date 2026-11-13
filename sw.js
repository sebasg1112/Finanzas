// Guarda la app en el teléfono para que abra al instante, y se actualiza sola por detrás.
// Tus datos NO pasan por aquí: van directo a tu hoja de Google (y la copia rápida queda en el propio teléfono).
const CACHE = "fin-shell-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./favicon-64.png"];
const CDN = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

const sameBody = async (a, b) => { try { return (await a.clone().text()) === (await b.clone().text()); } catch (e) { return true; } };

self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isPage = req.mode === "navigate" || (url.origin === location.origin && (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")));
  if (isPage) {
    // La página: se muestra la guardada y se baja la nueva por detrás; si cambió, se avisa a la app.
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match("./index.html");
      const net = fetch(req, {cache: "no-store"}).then(async res => {
        if (res.ok) { const changed = cached && !(await sameBody(res, cached)); await cache.put("./index.html", res.clone());
          if (changed) (await self.clients.matchAll()).forEach(c => c.postMessage({type: "updated"})); }
        return res; });
      if (cached) { e.waitUntil(net.catch(()=>{})); return cached; }
      return net;
    })());
    return;
  }
  if (url.origin === location.origin || CDN.includes(url.hostname)) {
    // Íconos, letras e imágenes: de la copia guardada, y se refrescan por detrás.
    e.respondWith((async () => {
      const cache = await caches.open(CACHE); const cached = await cache.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; });
      if (cached) { e.waitUntil(net.catch(()=>{})); return cached; }
      return net;
    })());
  }
});
