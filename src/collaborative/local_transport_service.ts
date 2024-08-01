import type { UID } from "../types";
import type {
  CollaborationMessage,
  NewMessageCallback,
  TransportService,
} from "../types/collaborative/transport_service";

export class LocalTransportService implements TransportService<CollaborationMessage> {
  private listeners: { id: UID; callback: NewMessageCallback }[] = [];

  sendMessage(message: CollaborationMessage) {
    for (const { callback } of this.listeners) {
      callback(message);
    }
  }
  onNewMessage(id: UID, callback: NewMessageCallback<CollaborationMessage>) {
    this.listeners.push({ id, callback });
  }

  leave(id: UID) {
    this.listeners = this.listeners.filter((listener) => listener.id !== id);
  }
}
