// self.addEventListener("install", (event) => {
//     event.waitUntil(
//         caches.open("cache").then((cache) => {
//             cache.addAll(['/main.js', '/style.css']);
//         })
//     );
// });

self.importScripts("./javascripts/bloomfilter.js");

self.filter = new self.BloomFilter(32 * 10, 3);

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response !== undefined) {
                console.log(`Got ${event.request.url} from cache`);
                return response;
            } else {
                const filterHeaders = {method: 'GET'};
                if (event.request.url.endsWith("/")) {
                    filterHeaders.headers = {
                        buckets: self.filter.buckets,
                        k: self.filter.k,
                    }
                    console.log(filterHeaders);
                }
                return fetch(event.request, filterHeaders)
                    .then((response) => {
                        if (response.url.endsWith('/'))
                            return response;
                        let responseClone = response.clone();

                        caches.open("cache").then((cache) => {
                            cache
                                .put(event.request, responseClone)
                                .then(() =>
                                    console.log(
                                        `Got ${response.url} from server and was added to cache`
                                    )
                                )
                                .catch((reason) =>
                                    console.log(
                                        `${response.url} not added to cache because of ${reason}`
                                    )
                                );
                        });

                        if (response.url.endsWith("/javascripts/main.js"))
                            self.filter.add("/javascripts/main.js");
                        if (response.url.endsWith("/stylesheets/style.css"))
                            self.filter.add("/stylesheets/style.css");

                        return response;
                    })
                    .catch(() => {
                        console.log("Asset does not exist");
                    });
            }
        })
    );
});
