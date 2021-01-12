import { DEFAULT_REVISION_ID } from "../../src/constants";
import {
  CollaborationMessage,
  NewMessageCallback,
  TransportService,
} from "../../src/types/collaborative/transport_service";

export class MockTransportService implements TransportService<CollaborationMessage> {
  private listeners: NewMessageCallback[] = [];
  private pendingMessages: CollaborationMessage[] = [];
  private isConcurrent: boolean = false;
  private serverRevisionId: string = DEFAULT_REVISION_ID;

  onNewMessage(callback: NewMessageCallback) {
    this.listeners.push(callback);
  }

  sendMessage(message: CollaborationMessage) {
    const msg = JSON.parse(JSON.stringify(message));
    switch (msg.type) {
      case "REMOTE_REVISION":
      case "REVISION_UNDONE":
      case "REVISION_REDONE":
        if (this.serverRevisionId === msg.serverRevisionId) {
          this.serverRevisionId = msg.nextRevisionId;
          this.broadcast(msg);
        }
        break;
      case "CLIENT_JOINED":
      case "CLIENT_LEFT":
      case "CLIENT_MOVED":
        this.broadcast(msg);
        break;
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

  notifyListeners(listeners: NewMessageCallback[], message: CollaborationMessage) {
    for (let callback of listeners) {
      callback(JSON.parse(JSON.stringify(message)));
    }
  }

  private broadcast(message: CollaborationMessage) {
    if (this.isConcurrent) {
      this.pendingMessages.push(message);
    } else {
      this.notifyListeners(this.listeners, message);
    }
  }
}
