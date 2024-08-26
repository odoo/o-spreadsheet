import { DEFAULT_REVISION_ID } from "../../src/constants";
import { deepCopy } from "../../src/helpers";
import { UID, WorkbookData } from "../../src/types";
import {
  CollaborationMessage,
  NewMessageCallback,
  TransportService,
} from "../../src/types/collaborative/transport_service";

export class MockTransportService implements TransportService<CollaborationMessage> {
  private listeners: { id: UID; callback: NewMessageCallback }[] = [];
  private pendingMessages: CollaborationMessage[] = [];
  private isConcurrent: boolean = false;
  private serverRevisionId: string = DEFAULT_REVISION_ID;
  snapshot?: WorkbookData;

  onNewMessage(id: UID, callback: NewMessageCallback) {
    this.listeners.push({ id, callback });
  }

  async sendMessage(message: CollaborationMessage) {
    const msg: CollaborationMessage = deepCopy(message);
    switch (msg.type) {
      case "REMOTE_REVISION":
      case "REVISION_UNDONE":
      case "REVISION_REDONE":
        if (this.serverRevisionId === msg.serverRevisionId) {
          this.serverRevisionId = msg.nextRevisionId;
          this.broadcast(msg);
        }
        break;
      case "SNAPSHOT":
        if (this.serverRevisionId === msg.serverRevisionId) {
          this.serverRevisionId = msg.nextRevisionId;
          this.broadcast({
            type: "SNAPSHOT_CREATED",
            nextRevisionId: msg.nextRevisionId,
            serverRevisionId: msg.serverRevisionId,
            version: 1,
          });
          this.snapshot = msg.data;
        }
        break;
      default:
        this.broadcast(msg);
        break;
    }
  }

  leave(id: UID) {
    this.listeners = this.listeners.filter((listener) => listener.id !== id);
  }

  concurrent(concurrentExecutionCallback: () => void) {
    this.isConcurrent = true;
    concurrentExecutionCallback();
    for (let message of this.pendingMessages) {
      this.notifyListeners(message);
    }
    this.isConcurrent = false;
    this.pendingMessages = [];
  }

  notifyListeners(message: CollaborationMessage) {
    for (const { callback } of this.listeners) {
      callback(deepCopy(message));
    }
  }

  private broadcast(message: CollaborationMessage) {
    if (this.isConcurrent) {
      this.pendingMessages.push(message);
    } else {
      this.notifyListeners(message);
    }
  }
}
