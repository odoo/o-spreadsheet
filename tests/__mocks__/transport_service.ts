import { DEFAULT_REVISION_ID } from "@odoo/o-spreadsheet-engine/constants";
import {
  CollaborationMessage,
  NewMessageCallback,
  TransportService,
} from "@odoo/o-spreadsheet-engine/types/collaborative/transport_service";
import { UID, WorkbookData } from "../../src/types";

export class MockTransportService implements TransportService<CollaborationMessage> {
  protected listeners: { id: UID; callback: NewMessageCallback }[] = [];
  private pendingMessages: CollaborationMessage[] = [];
  private isConcurrent: boolean = false;
  protected serverRevisionId: string = DEFAULT_REVISION_ID;
  snapshot?: WorkbookData;

  onNewMessage(id: UID, callback: NewMessageCallback) {
    this.listeners.push({ id, callback });
  }

  async sendMessage(message: CollaborationMessage) {
    // simulates network serialization, which removes undefined values of an object,
    // contrary to deepCopy
    const msg: CollaborationMessage = JSON.parse(JSON.stringify(message));
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
    for (const message of this.pendingMessages) {
      this.notifyListeners(message);
    }
    this.isConcurrent = false;
    this.pendingMessages = [];
  }

  notifyListeners(message: CollaborationMessage) {
    for (const { callback } of this.listeners) {
      // simulates network serialization, which removes undefined values of an object,
      // contrary to deepCopy
      callback(JSON.parse(JSON.stringify(message)));
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
