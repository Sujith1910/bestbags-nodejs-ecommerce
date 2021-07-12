// Event handler that executes when ServiceWorker is installed
self.addEventListener("install", (event) => {
    self.ws = new WebSocket('wss://localhost:50443');

    self.ws.addEventListener('open', (event) => {
        ws.send('Hello from client');
    });

    self.ws.addEventListener('message', (event) => {
        console.log(event.data);
    });
});