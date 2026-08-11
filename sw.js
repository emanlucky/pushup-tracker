const CACHE = "pushup-tracker-v4";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
];


/* ============================================================
   INSTALL
============================================================ */

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(FILES);
    })
  );

  self.skipWaiting();

});


/* ============================================================
   ACTIVATE
============================================================ */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys => {

      return Promise.all(

        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))

      );

    })

  );

  self.clients.claim();

});


/* ============================================================
   FETCH
============================================================ */

self.addEventListener("fetch", event => {

  /*
    Network-first for HTML, CSS, and JavaScript.

    This makes sure GitHub Pages updates actually
    reach the user instead of constantly serving
    the old cached version.
  */

  if (
    event.request.destination === "document" ||
    event.request.destination === "script" ||
    event.request.destination === "style"
  ) {

    event.respondWith(

      fetch(event.request)
        .then(response => {

          const responseClone = response.clone();

          caches.open(CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });

          return response;

        })
        .catch(() => {

          return caches.match(event.request);

        })

    );

    return;

  }


  /*
    Other files can still use the cache first.
  */

  event.respondWith(

    caches.match(event.request)
      .then(cached => {

        return cached || fetch(event.request);

      })

  );

});
