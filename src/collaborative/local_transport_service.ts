import {
  CollaborationMessage,
  NewMessageCallback,
  TransportService,
} from "../types/collaborative/transport_service";

export class LocalTransportService implements TransportService<CollaborationMessage> {
  private callbacks: NewMessageCallback[] = [];

  sendMessage(message: CollaborationMessage) {
    if (this.callbacks.length > 1) {
      throw new Error("oh oh this can't be good");
    }
    for (const cb of this.callbacks) {
      cb(message);
    }
    // new Promise((resolve) => {
    //   resolve(undefined)
    // })
  }
  onNewMessage(callback: NewMessageCallback<CollaborationMessage>) {
    this.callbacks.push(callback);
  }
}
