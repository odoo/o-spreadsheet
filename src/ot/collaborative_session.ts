import * as owl from "@odoo/owl";
import {
  Client,
  ClientId,
  ClientJoinedMessage,
  ClientLeftMessage,
  ClientMovedMessage,
  ClientPosition,
  Message,
  Network,
  RemoteRevisionData,
} from "../types/multi_users";

// class CollaborativeBus implements CollaborativeEventDispatcher{
//   bus = new owl.core.EventBus()

//   on: CollaborativeEventDispatcher["on"] = (eventType, owner, callback) => {
//     this.bus.on(eventType, owner, callback)
//   }

//   trigger: CollaborativeEventDispatcher["trigger"] = (eventType, data?) => {
//     this.bus.trigger(eventType, data);
//   }
// }

export class CollaborativeSession extends owl.core.EventBus {
  private positions: Record<ClientId, (ClientPosition & { name: string }) | undefined> = {};

  constructor(private network: Network, private client: Client) {
    super();
    network.onNewMessage(this.client.id, this.onMessageReceived.bind(this));
  }

  addRevision(revision: RemoteRevisionData) {
    this.network.sendMessage(revision);
  }

  move(position: ClientPosition) {
    const type = this.positions[this.client.id] ? "CLIENT_MOVED" : "CLIENT_JOINED";
    this.positions[this.client.id] = { ...position, name: this.client.name };
    this.network.sendMessage({ type, client: this.client, position });
  }

  leave() {
    delete this.positions[this.client.id];
    this.network.sendMessage({ type: "CLIENT_LEFT", clientId: this.client.id });
  }

  getClient(): Client {
    return this.client;
  }

  private onMessageReceived(message: Message) {
    switch (message.type) {
      case "CLIENT_MOVED":
        this.onClientMoved(message);
        break;
      case "CLIENT_JOINED":
        this.onClientJoined(message);
        break;
      case "CLIENT_LEFT":
        this.onClientLeft(message);
        break;
      case "REMOTE_REVISION":
        if (message.clientId !== this.client.id) {
          this.trigger("remote-revision-received", message);
        } else {
          this.trigger("revision-acknowledged", message);
        }
        break;
    }
    this.trigger("message-received");
  }

  private onClientMoved(message: ClientMovedMessage) {
    if (message.client.id !== this.client.id) {
      this.positions[message.client.id] = {
        ...message.position,
        name: message.client.name,
      };
    }
  }

  private onClientJoined(message: ClientJoinedMessage) {
    if (message.client.id !== this.client.id) {
      this.positions[message.client.id] = {
        ...message.position,
        name: message.client.name,
      };
      const currentPosition = this.positions[this.client.id];
      if (currentPosition) {
        this.move(currentPosition);
      }
    }
  }

  private onClientLeft(message: ClientLeftMessage) {
    if (message.clientId !== this.client.id) {
      delete this.positions[message.clientId];
    }
  }
}
