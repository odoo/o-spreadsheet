import {
  Network,
  Message,
  ClientId,
  NewMessageCallback,
  NetworkListener,
} from "../types/multi_users";

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

  // TODO clean this. Maybe make Network more generic
  async getTicket(): Promise<number> {
    // @ts-ignore
    return (await jsonRPC(`http://localhost:9000/timestamp`, {})).timestamp;

    function jsonRPC(url, data) {
      return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Content-type", "application/json");
        // const csrftoken = document.querySelector("[name=csrfmiddlewaretoken]").value;
        // xhr.setRequestHeader("X-CSRFToken", csrftoken);
        xhr.onload = function () {
          if (this.status >= 200 && this.status < 300) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject({
              status: this.status,
              statusText: xhr.statusText,
            });
          }
        };
        xhr.onerror = function () {
          reject({
            status: this.status,
            statusText: xhr.statusText,
          });
        };
        xhr.send(JSON.stringify(data));
      });
    }
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
