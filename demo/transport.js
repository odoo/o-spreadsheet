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

  onNewMessage(callback) {
    this.listeners.push(callback);
  }

  sendMessage(message) {
    const msg = JSON.stringify({ type: "multiuser_command", payload: message });
    this.queue.push(msg);
    this.processQueue();
  }

  notifyListeners(message) {
    for (let callback of this.listeners) {
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
