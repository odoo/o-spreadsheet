import {
  Network,
  NetworkListener,
  Message,
  ClientId,
  NewMessageCallback,
} from "../../src/types/multi_users";

export class MockNetwork implements Network {
  private listeners: NetworkListener[] = [];
  private pendingMessages: Message[] = [];
  private isConcurrent: boolean = false;
  private updates: Message[] = [];

  onNewMessage(clientId: ClientId, callback: NewMessageCallback) {
    this.listeners.push({ clientId, callback });
  }

  sendMessage(message: Message) {
    this.updates.push(JSON.parse(JSON.stringify(message)));
    if (this.isConcurrent) {
      this.pendingMessages.push(message);
    } else {
      this.notifyListeners(this.listeners, message);
    }
  }

  concurrent(concurrentExecutionCallback: () => void) {
    this.isConcurrent = true;
    concurrentExecutionCallback();
    this.isConcurrent = false;
    for (let message of this.pendingMessages) {
      this.notifyListeners(this.listeners, message);
    }
    this.pendingMessages = [];
  }

  private notifyListeners(listeners: NetworkListener[], message: Message) {
    for (let { callback } of listeners) {
      callback(JSON.parse(JSON.stringify(message)));
    }
  }
}
