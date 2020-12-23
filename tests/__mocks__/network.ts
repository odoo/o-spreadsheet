import { DEFAULT_REVISION_ID } from "../../src/constants";
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
  private revision: string = DEFAULT_REVISION_ID;

  onNewMessage(clientId: ClientId, callback: NewMessageCallback) {
    this.listeners.push({ clientId, callback });
  }

  sendMessage(message: Message) {
    if (message.type === "REMOTE_REVISION") {
      if (this.revision === message.revisionId) {
        this.revision = message.newRevisionId;
        this.updates.push(JSON.parse(JSON.stringify(message)));
        if (this.isConcurrent) {
          this.pendingMessages.push(message);
        } else {
          this.notifyListeners(this.listeners, message);
        }
      }
    }
    if (message.type === "SELECT_CELL") {
      if (this.isConcurrent) {
        this.pendingMessages.push(message);
      } else {
        this.notifyListeners(this.listeners, message);
      }
    }
  }

  concurrent(concurrentExecutionCallback: () => void) {
    this.isConcurrent = true;
    concurrentExecutionCallback();
    for (let message of this.pendingMessages) {
      this.notifyListeners(this.listeners, message);
    }
    this.isConcurrent = false;
    this.pendingMessages = [];
  }

  notifyListeners(listeners: NetworkListener[], message: Message) {
    for (let { callback } of listeners) {
      // console.log(`${message.type} from ${message.clientId} to ${clientId}`);
      callback(JSON.parse(JSON.stringify(message)));
    }
  }
}
