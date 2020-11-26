import {
  Network,
  Message,
  ClientId,
  NewMessageCallback,
  NetworkListener,
} from "../types/multi_users";

// TODO PRO-LUL Should not be in o-spreadsheet, should be in demo/ IMHO
export class WebsocketNetwork implements Network {
  private listeners: NetworkListener[] = [];
  private queue: any[] = [];
  private isConnected: boolean = false;
  private socket: WebSocket = new WebSocket(`ws://localhost:9000`);

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

  onNewMessage(clientId: ClientId, callback: NewMessageCallback) {
    this.listeners.push({ clientId, callback });
  }

  sendMessage(message: Message) {
    const msg = JSON.stringify({ type: "multiuser_command", payload: message });
    this.queue.push(msg);
    this.processQueue();
  }

  private notifyListeners(message: Message) {
    for (let { callback } of this.listeners) {
      callback(message);
    }
  }

  private processQueue() {
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
