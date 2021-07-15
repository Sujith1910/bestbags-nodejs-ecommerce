self.importScripts("./javascripts/bloomfilter.js");

// Event handler that executes when ServiceWorker is installed
self.addEventListener("install", (event) => {
    self.ws = new WebSocket('wss://demo-ecommerce.akalab.ca/');
    // self.ws = new WebSocket('wss://localhost:50443');

    //List of URLs for caching WS responses.
    self.requestsData = [];

    // Create BloomFilter
    const pushedAssetsLength = 2;
    self.filter = new self.BloomFilter(32 * 4 * pushedAssetsLength, 3);

    // Fires when WebSocket connection is first opened 
    self.ws.addEventListener('open', (event) => {
        self.ws.send(`{"method":"GET","buckets":[${self.filter.buckets}],"k":${self.filter.k}}`);
    });

    // Fires when a message is received from the server (in this cases, pushed assets)
    self.ws.addEventListener('message', (event) => {
        // console.log(event.data);
        if (event.data == 'CLOSE') {
            self.ws.close();
        } else {
            data = JSON.parse(event.data)
            console.log(data);
            self.filter.add(data.filename);

            // Cache resource
            // for(let i = 0; i < self.requestsData.length; i++) {
            //     if (self.requestsData[i].url.endsWith(data.filename)) {
            //         caches.open('ws-cache').then(cache => cache.put(self.requestsData[i], new Response(data.dep)));   
            //     }
            // }
        }
    });
});


// Event handler that executes when a request is made by the browser
// The ServiceWorker intercepts the network request, which can be accessed through the event.request object
self.addEventListener("fetch", (event) => {
    // console.log(event.request)
    event.respondWith(
        // Check if requested resource is in ServiceWorker Cache
        caches.match(event.request).then((response) => {
            if (response !== undefined) {
                console.log(`Got ${event.request.url} from cache`);
                return response;
            } else {
                self.requestsData.push(event.request);
                // Send Bloom Filter through WebSocket
                const filterHeaders = { 'method': 'GET' };
                if (event.request.url.endsWith("/")) {
                    self.ws = new WebSocket('wss://demo-ecommerce.akalab.ca/');
                    // self.ws = new WebSocket('wss://localhost:50443');

                    self.ws.addEventListener('open', (event) => {
                        self.ws.send(`{"method":"GET","buckets":[${self.filter.buckets}],"k":${self.filter.k}}`);
                    });

                    self.ws.addEventListener('message', (event) => {
                        if (event.data == 'CLOSE') {
                            self.ws.close();
                        } else {
                            data = JSON.parse(event.data)
                            console.log(data);
                            self.filter.add(data.filename);
                
                            // Cache resource
                            // for(let i = 0; i < self.requestsData.length; i++) {
                            //     if (self.requestsData[i].url.endsWith(data.filename)) {
                            //         caches.open('ws-cache').then(cache => cache.put(self.requestsData[i], new Response(data.dep)));   
                            //     }
                            // }
                        }
                    });
                }

                // console.log(event.request);

                // Network request to fetch the resource and add it to cache
                return fetch(event.request, filterHeaders)
                    .then((response) => {
                        // Exclude index.html from cache
                        if (response.url.endsWith('/'))
                            return response;

                        let responseClone = response.clone();
                        // console.log(response);

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
