const CACHE_NAME = "genius-v1.0.0";
const urlsToCache = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

// Service Workerのインストール
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Service Workerのアクティベート
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// フェッチイベントの処理
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // キャッシュに存在する場合はキャッシュから返す
      if (response) {
        return response;
      }

      // キャッシュに存在しない場合はネットワークから取得
      return fetch(event.request).then((response) => {
        // 有効なレスポンスでない場合はそのまま返す
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // レスポンスをクローンしてキャッシュに保存
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// バックグラウンド同期（オフライン時のデータ同期）
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      // オフライン時の統計データ同期処理
      console.log("Background sync triggered")
    );
  }
});

// プッシュ通知の処理（将来的な機能拡張用）
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "新しいゲームが利用可能です！",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "ゲームを開始",
        icon: "/icon-192.png",
      },
      {
        action: "close",
        title: "閉じる",
        icon: "/icon-192.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("GridRecall", options));
});

// 通知クリックの処理
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});
