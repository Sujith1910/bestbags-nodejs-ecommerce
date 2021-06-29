self.importScripts("./javascripts/bloomfilter.js");

// Event handler that executes when ServiceWorker is installed
self.addEventListener("install", (event) => {
    event.waitUntil(
        fetch('/').then(res => {
            // Get pushed assets from Link Headers
            const pushedAssets = res.headers.get('Link').split(', ').filter((value) => value.includes('type="pushed"'));

            // Create bloom filter
            self.filter = new self.BloomFilter(32 * 4 * pushedAssets.length, 3);

            // Add assets to bloom filter and store them in ServiceWorker Cache
            pushedAssets.forEach((asset) => {
                const assetPath = asset.slice(0, asset.indexOf(';'));
                caches.open("cache").then((cache) => cache.add(assetPath));
                self.filter.add(assetPath);
            });
            // console.log(pushedAssets, self.filter)
        })
    );
});

// Event handler that executes when a request is made by the browser
// The ServiceWorker intercepts the network request, which can be accessed through the event.request object
self.addEventListener("fetch", (event) => {
    event.respondWith(
        // Check if requested resource is in ServiceWorker Cache
        caches.match(event.request).then((response) => {
            if (response !== undefined) {
                console.log(`Got ${event.request.url} from cache`);
                return response;
            } else {
                // Add Bloom Filter to Request Headers
                const filterHeaders = { method: 'GET' };
                if (event.request.url.endsWith("/")) {
                    filterHeaders.headers = {
                        buckets: self.filter.buckets,
                        k: self.filter.k,
                    }
                    console.log(filterHeaders);
                }
                // console.log(event.request);

                // Network request to fetch the resource and add it to cache
                return fetch(event.request, filterHeaders)
                    .then((response) => {
                        // Exclude index.html from cache
                        if (response.url.endsWith('/'))
                            return response;

                        let responseClone = response.clone();

                        // Add fetched resource to cache
                        caches.open("cache").then((cache) => {
                            cache
                                .put(event.request, responseClone)
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
