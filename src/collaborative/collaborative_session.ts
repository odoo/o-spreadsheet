import { DEFAULT_REVISION_ID } from "../constants";
import { EventBus } from "../helpers/event_bus";
import { isDefined } from "../helpers/misc";
import { UID } from "../types";
import {
  Client,
  ClientId,
  ClientPosition,
  Session,
  CollaborativeEvent,
} from "../types/collaborative/session";
import {
  ClientJoinedMessage,
  ClientLeftMessage,
  ClientMovedMessage,
  CollaborationMessage,
  TransportService,
} from "../types/collaborative/transport_service";
import { Revision, RevisionData } from "../types/collaborative/revisions";

export class CollaborativeSession extends EventBus<CollaborativeEvent> implements Session {
  /**
   * Positions of the others client.
   */
  private positions: Record<ClientId, Client | undefined> = {};

  /**
   * Id of the server revision
   */
  private revisionId: UID = DEFAULT_REVISION_ID;

  /**
   * @param transportService communication channel used to send and receive messages
   * between all connected clients
   * @param client the client connected locally
   */
  constructor(
    private transportService: TransportService<CollaborationMessage>,
    private client: Client
  ) {
    super();
    transportService.onNewMessage(this.onMessageReceived.bind(this));
  }

  addRevision(revisionData: RevisionData) {
    this.transportService.sendMessage({
      type: "REMOTE_REVISION",
      revisionId: this.revisionId,
      revision: {
        clientId: revisionData.clientId,
        commands: revisionData.commands,
        id: revisionData.id,
      },
    });
  }

  applyInitialRevisions(revisions: RevisionData[]) {
    for (const { id, clientId, commands } of revisions) {
      const revision = new Revision(id, clientId, {
        commands: commands,
      });
      this.revisionId = revision.id;
      this.trigger("remote-revision-received", revision);
    }
  }

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
    this.transportService.sendMessage({ type, client: this.client, position });
  }

  leave() {
    delete this.positions[this.client.id];
    this.transportService.sendMessage({ type: "CLIENT_LEFT", clientId: this.client.id });
  }

  getClient(): Client {
    return this.client;
  }

  getConnectedClients(): Set<Client> {
    return new Set(Object.values(this.positions).filter(isDefined));
  }

  getRevisionId(): UID {
    return this.revisionId;
  }

  setRevisionId(id: UID) {
    this.revisionId = id;
  }

  /**
   * Handles messages received from other clients in the collaborative
   * session.
   */
  private onMessageReceived(message: CollaborationMessage) {
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
        const { id, clientId, commands } = message.revision;
        const revision = new Revision(id, clientId, {
          commands: commands,
        });
        this.revisionId = revision.id;
        if (revision.clientId !== this.client.id) {
          this.trigger("remote-revision-received", revision);
        } else {
          this.trigger("revision-acknowledged", revision);
        }
        break;
    }
    this.trigger("collaborative-event-received");
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
