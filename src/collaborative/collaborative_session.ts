import { EventBus } from "../helpers/event_bus";
import { isDefined } from "../helpers/misc";
import {
  Client,
  ClientId,
  ClientJoinedMessage,
  ClientLeftMessage,
  ClientMovedMessage,
  ClientPosition,
  Session,
  Message,
  Network,
  RemoteRevisionData,
  CollaborativeEvent,
} from "../types/multi_users";

export class CollaborativeSession extends EventBus<CollaborativeEvent> implements Session {
  private positions: Record<ClientId, Client | undefined> = {};

  constructor(private network: Network, private client: Client) {
    super();
    network.onNewMessage(this.client.id, this.onMessageReceived.bind(this));
  }

  addRevision(revision: RemoteRevisionData) {
    this.network.sendMessage(revision);
  }

  move(position: ClientPosition) {
    const type = this.positions[this.client.id] ? "CLIENT_MOVED" : "CLIENT_JOINED";
    this.positions[this.client.id] = { id: this.client.id, name: this.client.name, position };
    this.network.sendMessage({ type, client: this.client, position });
  }

  leave() {
    delete this.positions[this.client.id];
    this.network.sendMessage({ type: "CLIENT_LEFT", clientId: this.client.id });
  }

  getClient(): Client {
    return this.client;
  }

  getConnectedClients(): Set<Client> {
    return new Set(Object.values(this.positions).filter(isDefined));
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
        id: message.client.id,
        name: message.client.name,
        position: message.position,
      };
    }
  }

  private onClientJoined(message: ClientJoinedMessage) {
    if (message.client.id !== this.client.id) {
      this.positions[message.client.id] = {
        id: message.client.id,
        name: message.client.name,
        position: message.position,
      };
      const client = this.positions[this.client.id];
      if (client && client.position) {
        this.move(client.position);
      }
    }
  }

  private onClientLeft(message: ClientLeftMessage) {
    if (message.clientId !== this.client.id) {
      delete this.positions[message.clientId];
    }
  }
}
