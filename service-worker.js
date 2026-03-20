/* eslint-disable no-restricted-globals */
'use strict';

// キャッシュ名（更新時は末尾を上げる）
const CACHE_NAME = 'tetris-pwa-v1';

// 事前キャッシュする必須アセット
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // icon.png が未配置だと addAll が失敗して SW が入らないので、個別に握りつぶしつつキャッシュする
    const required = PRECACHE_URLS.filter((u) => u !== './icon.png');
    await cache.addAll(required);
    try {
      await cache.add('./icon.png');
    } catch {
      // icon.png はユーザーが後で配置する想定（manifest は参照する）
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k !== CACHE_NAME)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 同一オリジンのみ扱う（拡張・外部は素通し）
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      // 取得できたものはキャッシュして次回オフラインに備える
      if (fresh && fresh.ok) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      // ナビゲーション時のフォールバック（オフラインでの再読み込み）
      if (req.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }
      throw new Error('Offline and not cached');
    }
  })());
});

