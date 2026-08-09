/* 音のパッケージ100 — オフライン対応 */
const CACHE = "otopack-20260810-0029";
const SHELL = ["./", "./index.html"];

// 1件でも失敗すると全部入らない addAll は使わず、1件ずつ入れて取りこぼしを防ぐ
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map(u =>
      fetch(u, { cache: "reload" })
        .then(r => r.ok && cache.put(u, r))
        .catch(() => {})
    ));
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

// ネットワーク優先。つながらないときだけキャッシュを返す（更新の取りこぼしを防ぐ）
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await withTimeout(fetch(req), 5000);
      if (fresh && fresh.ok) { cache.put(req, fresh.clone()); return fresh; }
      throw new Error("bad response");
    } catch {
      return (await cache.match(req))
          || (await cache.match("./"))
          || (await cache.match("./index.html"))
          || Response.error();
    }
  })());
});

function withTimeout(p, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout")), ms);
    p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
}
