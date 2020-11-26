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
  RemoteRevisionMessage,
  CollaborativeEvent,
} from "../types/multi_users";

/**
 * This role of this class is to manage the communication between multiple clients.
 * It also manages the positions of all the clients in the spreadsheet
 */
export class CollaborativeSession extends EventBus<CollaborativeEvent> implements Session {
  private positions: Record<ClientId, Client | undefined> = {};

  constructor(private network: Network, private client: Client) {
    super();
    network.onNewMessage(this.client.id, this.onMessageReceived.bind(this));
  }

  /**
   * Send a revision to the server
   */
  addRevision(revision: RemoteRevisionMessage) {
    this.network.sendMessage(revision);
  }

  /**
   * Notify that the position of the client has changed
   */
  move(position: ClientPosition) {
    const currentPosition = this.positions[this.client.id];
    if (
      currentPosition?.position?.col === position.col &&
      currentPosition.position.row === position.row &&
      currentPosition.position.sheetId === position.sheetId
    ) {
      return;
    }
    const type = currentPosition ? "CLIENT_MOVED" : "CLIENT_JOINED";
    this.positions[this.client.id] = { id: this.client.id, name: this.client.name, position };
    this.network.sendMessage({ type, client: this.client, position });
  }

  /**
   * Notify the server that the user client left the collaborative session
   */
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
