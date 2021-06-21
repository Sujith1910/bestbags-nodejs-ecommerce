// self.addEventListener("install", (event) => {
//     event.waitUntil(
//         caches.open("cache").then((cache) => {
//             cache.addAll(['/main.js', '/style.css']);
//         })
//     );
// });

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response !== undefined) {
                console.log(`Got ${event.request.url} from cache`)
                return response;
            } else {
                return fetch(event.request)
                    .then((response) => {
                        let responseClone = response.clone();

                        caches.open("cache").then((cache) => {
                            cache.put(event.request, responseClone)
                                .then(() => console.log(`Got ${response.url} from server and was added to cache`))
                                .catch((reason) => console.log(`${response.url} not added to cache because of ${reason}`));
                        });
                        
                        return response;
                    })
                    .catch(() => {
                        console.log("Asset does not exist");
                    });
            }
        })
    );
});