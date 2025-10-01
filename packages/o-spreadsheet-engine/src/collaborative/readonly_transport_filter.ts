import {
  CollaborationMessage,
  NewMessageCallback,
  TransportService,
} from "src/types/collaborative/transport_service";
import { UID } from "../../../../src/types";

export class ReadonlyTransportFilter implements TransportService<CollaborationMessage> {
  constructor(private transportService: TransportService<CollaborationMessage>) {}

  async sendMessage(message: CollaborationMessage) {
    if (
      message.type === "CLIENT_JOINED" ||
      message.type === "CLIENT_LEFT" ||
      message.type === "CLIENT_MOVED"
    ) {
      this.transportService.sendMessage(message);
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
