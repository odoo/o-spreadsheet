/**
 * This class is used to communicate with the demo server through websocket
 */
export class WebsocketTransport {
  listeners = [];
  queue = [];
  isConnected = false;
  socket = new WebSocket(`ws://localhost:9000`);

  constructor() {
    this.socket.addEventListener("open", () => {
      this.isConnected = true;
      this.processQueue();
    });
    this.socket.addEventListener("message", (ev) => {
      const message = JSON.parse(ev.data);
      this.notifyListeners(message);
    });
  }

  onNewMessage(id, callback) {
    this.listeners.push({ id, callback });
  }

  leave(id) {
    this.listeners = this.listeners.filter((listener) => listener.id !== id);
  }

  sendMessage(message) {
    const msg = JSON.stringify(message);
    this.queue.push(msg);
    this.processQueue();
  }

  notifyListeners(message) {
    for (let { callback } of this.listeners) {
      callback(message);
    }
  }

  processQueue() {
    if (!this.isConnected) {
      return;
    }
    let msg = this.queue.shift();
    while (msg) {
      this.socket.send(msg);
      msg = this.queue.shift();
    }
  }
}
