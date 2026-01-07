import {
  CollaborationMessage,
  NewMessageCallback,
  TransportService,
} from "../types/collaborative/transport_service";
import { UID } from "../types/misc";

export class ReadonlyTransportFilter implements TransportService<CollaborationMessage> {
  constructor(private transportService: TransportService<CollaborationMessage>) {}

  async sendMessage(message: CollaborationMessage) {
    if (
      message.type === "CLIENT_JOINED" ||
      message.type === "CLIENT_LEFT" ||
      message.type === "CLIENT_MOVED"
    ) {
      await this.transportService.sendMessage(message);
    }
    // ignore all other messages
  }

  onNewMessage(id: UID, callback: NewMessageCallback<CollaborationMessage>) {
    this.transportService.onNewMessage(id, callback);
  }

  leave(id: UID) {
    this.transportService.leave(id);
  }
}
