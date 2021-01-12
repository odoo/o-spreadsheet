import * as owl from "@odoo/owl";
import { DEBOUNCE_TIME, DEFAULT_REVISION_ID } from "../constants";
import { EventBus } from "../helpers/event_bus";
import { isDefined } from "../helpers/misc";
import { SelectiveHistory as RevisionLog } from "../history/selective_history";
import {
  Client,
  ClientId,
  ClientPosition,
  CollaborativeEvent,
} from "../types/collaborative/session";
import {
  ClientJoinedMessage,
  ClientLeftMessage,
  ClientMovedMessage,
  CollaborationMessage,
  StateUpdateMessage,
  TransportService,
} from "../types/collaborative/transport_service";
import { Revision } from "../types/collaborative/revisions";
import { uuidv4 } from "../helpers";
import { CoreCommand, HistoryChange, UID } from "../types";

export class Session extends EventBus<CollaborativeEvent> {
  /**
   * Positions of the others client.
   */
  private clients: Record<ClientId, Client | undefined> = {};
  private clientId: ClientId;

  /**
   * Id of the server revision
   */
  private debouncedMove: Session["move"];
  private pendingMessages: StateUpdateMessage[] = [];

  private waitingAck: boolean = false;

  /**
   * Manages the collaboration between multiple users on the same spreadsheet.
   * It can forward local state changes to other users to ensure they all eventually
   * reach the same state.
   * It also manages the positions of each clients in the spreadsheet to provide
   * a visual indication of what other users are doing in the spreadsheet.
   *
   * @param transportService communication channel used to send and receive messages
   * between all connected clients
   * @param client the client connected locally
   */
  constructor(
    private revisions: RevisionLog<Revision>,
    private transportService: TransportService<CollaborationMessage>,
    client: Client,
    private serverRevisionId: UID = DEFAULT_REVISION_ID
  ) {
    super();
    this.clients[client.id] = client;
    this.clientId = client.id;
    transportService.onNewMessage(this.onMessageReceived.bind(this));

    // should the timeout be cleared when the session is destroyed?
    this.debouncedMove = owl.utils.debounce(
      this._move.bind(this),
      DEBOUNCE_TIME
    ) as Session["move"];
  }

  /**
   * Add a new revision to the collaborative session.
   * It will be transmitted to all other connected clients.
   */
  save(commands: CoreCommand[], changes: HistoryChange[]) {
    if (!commands.length || !changes.length) return;
    const revision = new Revision(uuidv4(), this.clientId, commands, changes);
    this.revisions.add(revision.id, revision);
    this.trigger("new-local-state-update", { id: revision.id });
    if (this.waitingAck) {
      return;
    }
    this.waitingAck = true;
    this.sendUpdateMessage({
      type: "REMOTE_REVISION",
      serverRevisionId: this.serverRevisionId,
      nextRevisionId: revision.id,
      revision: {
        clientId: revision.clientId,
        commands: revision.commands,
        id: revision.id,
      },
    });
  }

  undo(revisionId: UID) {
    this.sendUpdateMessage({
      type: "REVISION_UNDONE",
      serverRevisionId: this.serverRevisionId,
      nextRevisionId: uuidv4(),
      undoneRevisionId: revisionId,
    });
  }

  redo(revisionId: UID) {
    this.sendUpdateMessage({
      type: "REVISION_REDONE",
      serverRevisionId: this.serverRevisionId,
      nextRevisionId: uuidv4(),
      redoneRevisionId: revisionId,
    });
  }

  catchUpMessages(messages: StateUpdateMessage[]) {
    for (const message of messages) {
      this.onMessageReceived(message);
    }
  }

  /**
   * Notify that the position of the client has changed
   */
  move(position: ClientPosition) {
    this.debouncedMove(position);
  }

  /**
   * Notify the server that the user client left the collaborative session
   */
  leave() {
    delete this.clients[this.clientId];
    this.transportService.sendMessage({ type: "CLIENT_LEFT", clientId: this.clientId });
  }

  getClient(): Client {
    const client = this.clients[this.clientId];
    if (!client) {
      throw new Error("The client left the session");
    }
    return client;
  }

  getConnectedClients(): Set<Client> {
    return new Set(Object.values(this.clients).filter(isDefined));
  }

  getRevisionId(): UID {
    return this.serverRevisionId;
  }

  isFullySynchronized(): boolean {
    return this.pendingMessages.length === 0;
  }

  private _move(position: ClientPosition) {
    const currentPosition = this.clients[this.clientId]?.position;
    if (
      currentPosition?.col === position.col &&
      currentPosition.row === position.row &&
      currentPosition.sheetId === position.sheetId
    ) {
      return;
    }
    const type = currentPosition ? "CLIENT_MOVED" : "CLIENT_JOINED";
    const client = this.getClient();
    this.clients[this.clientId] = { ...client, position };
    this.transportService.sendMessage({ type, client: { ...client, position } });
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
      case "REVISION_REDONE": {
        this.waitingAck = false;
        this.revisions.redo(message.redoneRevisionId, message.nextRevisionId);
        this.trigger("revision-redone", { revisionId: message.redoneRevisionId });
        break;
      }
      case "REVISION_UNDONE":
        this.waitingAck = false;
        this.revisions.undo(message.undoneRevisionId, message.nextRevisionId);
        this.trigger("revision-undone", { revisionId: message.undoneRevisionId });
        break;
      case "REMOTE_REVISION":
        this.waitingAck = false;
        if (message.serverRevisionId !== this.serverRevisionId) {
          this.trigger("unexpected-revision-id");
        }
        const { id, clientId, commands } = message.revision;
        const revision = new Revision(id, clientId, commands);
        if (revision.clientId !== this.clientId) {
          this.revisions.insertExternal(revision.id, revision, message.serverRevisionId);
          this.trigger("remote-revision-received", { commands });
        }
        break;
    }
    this.acknowledge(message);
    this.trigger("collaborative-event-received");
  }

  private onClientMoved(message: ClientMovedMessage) {
    if (message.client.id !== this.clientId) {
      this.clients[message.client.id] = message.client;
    }
  }

  /**
   * Register the new client and send your
   * own position back.
   */
  private onClientJoined(message: ClientJoinedMessage) {
    if (message.client.id !== this.clientId) {
      this.clients[message.client.id] = message.client;
      const client = this.clients[this.clientId];
      if (client) {
        const { position } = client;
        if (position) {
          this.transportService.sendMessage({
            type: "CLIENT_MOVED",
            client: { ...client, position },
          });
        }
      }
    }
  }

  private onClientLeft(message: ClientLeftMessage) {
    if (message.clientId !== this.clientId) {
      delete this.clients[message.clientId];
    }
  }

  private sendUpdateMessage(message: StateUpdateMessage) {
    this.pendingMessages.push(message);
    this.sendPendingMessage();
  }

  private sendPendingMessage() {
    let message = this.pendingMessages[0];
    if (!message) return;
    if (message.type === "REMOTE_REVISION") {
      const revision = this.revisions.get(message.revision.id);
      message = {
        ...message,
        revision: {
          clientId: revision.clientId,
          commands: revision.commands,
          id: revision.id,
        },
      };
    }
    this.transportService.sendMessage({
      ...message,
      serverRevisionId: this.serverRevisionId,
    });
  }

  private acknowledge(message: CollaborationMessage) {
    switch (message.type) {
      case "REMOTE_REVISION":
      case "REVISION_REDONE":
      case "REVISION_UNDONE":
        this.pendingMessages = this.pendingMessages.filter(
          (msg) => msg.nextRevisionId !== message.nextRevisionId
        );
        this.serverRevisionId = message.nextRevisionId;
        this.sendPendingMessage();
        break;
    }
  }
}
