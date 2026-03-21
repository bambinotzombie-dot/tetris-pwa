// キャッシュのバージョン。ここを v2 に上げることで、スマホに「新しくなったぞ！」と気づかせます
const CACHE_NAME = 'tetris-cache-v2'; 

// オフラインでも動かすために保存するファイルのリスト
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png',
  './bgm.mp3' // ← スマホがBGMを認識できるように、ここに確実に追加しました！
];

// 【インストール時】指定したファイルをスマホの中にダウンロードする
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 古いキャッシュが残っていても、強制的に新しい方を待機なしでインストールする（超重要）
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

// 【アクティブ時】古いバージョンのキャッシュ（v1など）を見つけてゴミ箱に捨てる
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // 古い呪い（キャッシュ）をここで物理削除
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // 開いているページに即座に新しいプログラムを適用する
    })
  );
});

// 【通信時】キャッシュ優先、無ければネットワークから取得
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});