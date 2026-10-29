// 오프라인 실행용: 앱 파일을 캐시하고, 네트워크가 되면 최신으로 갱신
// 배포할 때마다 CACHE 와 index.html 의 calc.js?v= 값을 같은 숫자로 올린다
const CACHE = 'gostop-v14';
const FILES = ['./', 'index.html', 'calc.js?v=14', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// 네트워크가 너무 늦으면(신호 약함) 저장된 사본으로 바로 연다
function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((r) => { clearTimeout(t); resolve(r); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// 네트워크 우선: 정상 응답(200번대)만 캐시에 넣고, 오류 응답(404·5xx)이면 저장된 사본을 쓴다
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = (await cache.match(e.request)) || (e.request.mode === 'navigate' ? await cache.match('./') : undefined);
    try {
      const net = await withTimeout(fetch(e.request), cached ? 4000 : 20000);
      if (net.ok) { cache.put(e.request, net.clone()); return net; }
      return cached || net;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  })());
});
