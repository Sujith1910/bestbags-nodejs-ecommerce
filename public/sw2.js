// Event handler that executes when ServiceWorker is installed
self.addEventListener("install", (event) => {
    // event.waitUntil(
    //     fetch('/').then(res => {
    //         // Get pushed assets from Link Headers
    //         const pushedAssets = res.headers.get('Link').split(', ').filter((value) => value.includes('type="pushed"'));

    //         // Create bloom filter
    //         self.filter = new self.BloomFilter(32 * 4 * pushedAssets.length, 3);

    //         // Add assets to bloom filter and store them in ServiceWorker Cache
    //         pushedAssets.forEach((asset) => {
    //             const assetPath = asset.slice(0, asset.indexOf(';'));
    //             caches.open("cache").then((cache) => cache.add(assetPath));
    //             self.filter.add(assetPath);
    //         });
    //         // console.log(pushedAssets, self.filter)
    //     })
    // );
    self.ws = new WebSocket('wss://localhost:50443');

    self.ws.addEventListener('open', (event) => {
        ws.send('Hello from client');
    });

    self.ws.addEventListener('message', (event) => {
        console.log(event.data);
    });
});