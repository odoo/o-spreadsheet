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
  private updates: CollaborationMessage[] = [];
  private revision: string = DEFAULT_REVISION_ID;

  onNewMessage(callback: NewMessageCallback) {
    this.listeners.push(callback);
  }

  sendMessage(message: CollaborationMessage) {
    if (message.type === "REMOTE_REVISION") {
      if (this.revision === message.revisionId) {
        this.revision = message.revision.id;
        this.updates.push(JSON.parse(JSON.stringify(message)));
        if (this.isConcurrent) {
          this.pendingMessages.push(message);
        } else {
          this.notifyListeners(this.listeners, message);
        }
      }
    } else {
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

  notifyListeners(listeners: NewMessageCallback[], message: CollaborationMessage) {
    for (let callback of listeners) {
      callback(JSON.parse(JSON.stringify(message)));
    }
  }
}
