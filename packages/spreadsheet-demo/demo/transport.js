/**
 * This class is used to communicate with the demo server through websocket
 */
export class WebsocketTransport {
  listeners = [];
  queue = [];
  isConnected = false;
  socket = null;

  /**
   * Open a connection to the collaborative server.
   *
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://localhost:9090`);
      socket.addEventListener("open", () => {
        this.socket = socket;
        this.isConnected = true;
        this.processQueue();
        resolve();
      });
      socket.addEventListener("message", (ev) => {
        const message = JSON.parse(ev.data);
        this.notifyListeners(message);
      });
      socket.addEventListener("error", reject);
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
