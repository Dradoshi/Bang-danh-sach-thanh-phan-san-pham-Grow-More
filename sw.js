/* Service worker: cho phép mở lại trang khi mất mạng và cài như ứng dụng.
   - Trang chính: ưu tiên lấy bản mới từ mạng, mất mạng thì dùng bản đã lưu.
   - Thư viện (SheetJS, Firebase, font): lưu sau lần tải đầu để lần sau dùng được cả khi mạng yếu.
   - Dữ liệu Firestore / đăng nhập Google KHÔNG đi qua đây (luôn lấy trực tiếp từ máy chủ). */
const V = 'growmore-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const LIBS = u =>
  u.hostname === 'cdnjs.cloudflare.com' ||
  u.hostname === 'fonts.googleapis.com' ||
  u.hostname === 'fonts.gstatic.com' ||
  (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});
const put = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) caches.open(V).then(c => c.put(req, res.clone())).catch(() => {});
  return res;
};
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (r.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html')) {
      e.respondWith(fetch(r).then(res => put(r, res)).catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
    } else {
      e.respondWith(caches.match(r).then(m => {
        const net = fetch(r).then(res => put(r, res)).catch(() => m);
        return m || net;
      }));
    }
    return;
  }
  if (LIBS(u)) {
    e.respondWith(caches.match(r).then(m => {
      const net = fetch(r).then(res => put(r, res)).catch(() => m);
      return m || net;
    }));
  }
  /* các yêu cầu khác (Firestore, đăng nhập) để trình duyệt tự xử lý */
});
