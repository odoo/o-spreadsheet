import { DEBOUNCE_TIME, DEFAULT_REVISION_ID, MESSAGE_VERSION } from "../constants";
import { UuidGenerator } from "../helpers";
import { EventBus } from "../helpers/event_bus";
import { debounce, isDefined } from "../helpers/misc";
import { SelectiveHistory as RevisionLog } from "../history/selective_history";
import { CoreCommand, HistoryChange, Lazy, UID, WorkbookData } from "../types";
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
  RemoteRevisionMessage,
  StateUpdateMessage,
  TransportService,
} from "../types/collaborative/transport_service";
import { Command } from "./../types/commands";
import { transformAll } from "./ot/ot";
import { Revision } from "./revisions";

export class ClientDisconnectedError extends Error {}

export class Session extends EventBus<CollaborativeEvent> {
  /**
   * Positions of the others client.
   */
  private clients: Record<ClientId, Client | undefined> = {};
  private clientId: ClientId = "local";

  /**
   * Id of the server revision
   */
  private debouncedMove: Session["move"];
  private pendingMessages: StateUpdateMessage[] = [];

  private waitingAck: boolean = false;
  /**
   * Flag used to block all commands when an undo or redo is triggered, until
   * it is accepted on the server
   */
  private waitingUndoRedoAck: boolean = false;
  private isReplayingInitialRevisions = false;

  private processedRevisions: Set<UID> = new Set();

  private uuidGenerator = new UuidGenerator();
  private lastLocalOperation: Revision | undefined;
  /**
   * Manages the collaboration between multiple users on the same spreadsheet.
   * It can forward local state changes to other users to ensure they all eventually
   * reach the same state.
   * It also manages the positions of each clients in the spreadsheet to provide
   * a visual indication of what other users are doing in the spreadsheet.
   *
   * @param revisions
   * @param transportService communication channel used to send and receive messages
   * between all connected clients
   * @param client the client connected locally
   * @param serverRevisionId
   */
  constructor(
    private revisions: RevisionLog<Revision>,
    private transportService: TransportService<CollaborationMessage>,
    private serverRevisionId: UID = DEFAULT_REVISION_ID
  ) {
    super();

    this.debouncedMove = debounce(this._move.bind(this), DEBOUNCE_TIME) as Session["move"];
  }

  canApplyOptimisticUpdate() {
    return !this.waitingUndoRedoAck;
  }

  /**
   * Add a new revision to the collaborative session.
   * It will be transmitted to all other connected clients.
   */
  save(rootCommand: Command, commands: CoreCommand[], changes: HistoryChange[]) {
    if (!commands.length || !changes.length || !this.canApplyOptimisticUpdate()) return;
    const revision = new Revision(
      this.uuidGenerator.uuidv4(),
      this.clientId,
      commands,
      rootCommand,
      changes,
      Date.now()
    );
    this.revisions.append(revision.id, revision);
    // REQUEST_REDO just repeats the last operation, the
    // last operation is still the same and should not change.
    if (rootCommand.type !== "REQUEST_REDO") {
      this.lastLocalOperation = revision;
    }
    this.trigger("new-local-state-update", { id: revision.id });
    this.sendUpdateMessage({
      type: "REMOTE_REVISION",
      version: MESSAGE_VERSION,
      serverRevisionId: this.serverRevisionId,
      nextRevisionId: revision.id,
      clientId: revision.clientId,
      commands: revision.commands,
    });
  }

  undo(revisionId: UID) {
    this.waitingUndoRedoAck = true;
    this.sendUpdateMessage({
      type: "REVISION_UNDONE",
      version: MESSAGE_VERSION,
      serverRevisionId: this.serverRevisionId,
      nextRevisionId: this.uuidGenerator.uuidv4(),
      undoneRevisionId: revisionId,
    });
  }

  redo(revisionId: UID) {
    this.waitingUndoRedoAck = true;
    this.sendUpdateMessage({
      type: "REVISION_REDONE",
      version: MESSAGE_VERSION,
      serverRevisionId: this.serverRevisionId,
      nextRevisionId: this.uuidGenerator.uuidv4(),
      redoneRevisionId: revisionId,
    });
  }

  /**
   * Notify that the position of the client has changed
   */
  move(position: ClientPosition) {
    this.debouncedMove(position);
  }

  join(client?: Client) {
    if (client) {
      this.clients[client.id] = client;
      this.clientId = client.id;
    } else {
      this.clients["local"] = { id: "local", name: "local" };
      this.clientId = "local";
    }
    this.transportService.onNewMessage(this.clientId, this.onMessageReceived.bind(this));
  }

  loadInitialMessages(messages: StateUpdateMessage[]) {
    this.isReplayingInitialRevisions = true;
    for (const message of messages) {
      this.onMessageReceived(message);
    }
    this.isReplayingInitialRevisions = false;
  }

  /**
   * Notify the server that the user client left the collaborative session
   */
  leave(data: Lazy<WorkbookData>) {
    if (Object.keys(this.clients).length === 1 && this.processedRevisions.size) {
      this.snapshot(data());
    }
    delete this.clients[this.clientId];
    this.transportService.leave(this.clientId);
    this.transportService.sendMessage({
      type: "CLIENT_LEFT",
      clientId: this.clientId,
      version: MESSAGE_VERSION,
    });
  }

  /**
   * Send a snapshot of the spreadsheet to the collaboration server
   */
  snapshot(data: WorkbookData) {
    if (this.pendingMessages.length !== 0) {
      return;
    }
    const snapshotId = this.uuidGenerator.uuidv4();
    this.transportService.sendMessage({
      type: "SNAPSHOT",
      nextRevisionId: snapshotId,
      serverRevisionId: this.serverRevisionId,
      data: { ...data, revisionId: snapshotId },
      version: MESSAGE_VERSION,
    });
  }

  getClient(): Client {
    const client = this.clients[this.clientId];
    if (!client) {
      throw new ClientDisconnectedError("The client left the session");
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

  /**
   * Get the last local revision
   * */
  getLastLocalNonEmptyRevision(): Revision | undefined {
    return this.lastLocalOperation;
  }

  private _move(position: ClientPosition) {
    // this method is debounced and might be called after the client
    // left the session.
    if (!this.clients[this.clientId]) return;
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
    this.transportService.sendMessage({
      type,
      version: MESSAGE_VERSION,
      client: { ...client, position },
    });
  }

  /**
   * Handles messages received from other clients in the collaborative
   * session.
   */
  private onMessageReceived(message: CollaborationMessage) {
    if (this.isAlreadyProcessed(message)) return;
    if (this.isWrongServerRevisionId(message)) {
      this.trigger("unexpected-revision-id");
      return;
    }
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
        this.revisions.redo(
          message.redoneRevisionId,
          message.nextRevisionId,
          message.serverRevisionId
        );
        this.trigger("revision-redone", {
          revisionId: message.redoneRevisionId,
          commands: this.revisions.get(message.redoneRevisionId).commands,
        });
        break;
      }
      case "REVISION_UNDONE":
        this.revisions.undo(
          message.undoneRevisionId,
          message.nextRevisionId,
          message.serverRevisionId
        );
        this.trigger("revision-undone", {
          revisionId: message.undoneRevisionId,
          commands: this.revisions.get(message.undoneRevisionId).commands,
        });
        break;
      case "REMOTE_REVISION":
        const { clientId, commands, timestamp } = message;
        const revision = new Revision(
          message.nextRevisionId,
          clientId,
          commands,
          undefined,
          undefined,
          timestamp
        );
        if (revision.clientId !== this.clientId) {
          this.revisions.insert(revision.id, revision, message.serverRevisionId);
          const pendingCommands = this.pendingMessages
            .filter((msg) => msg.type === "REMOTE_REVISION")
            .map((msg) => (msg as RemoteRevisionMessage).commands)
            .flat();
          this.trigger("remote-revision-received", {
            commands: transformAll(commands, pendingCommands),
          });
        }
        break;
      case "SNAPSHOT_CREATED": {
        const revision = new Revision(
          message.nextRevisionId,
          "server",
          [],
          undefined,
          undefined,
          Date.now()
        );
        this.revisions.insert(revision.id, revision, message.serverRevisionId);
        this.dropPendingHistoryMessages();
        this.trigger("snapshot");
        this.lastLocalOperation = undefined;
        break;
      }
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
            version: MESSAGE_VERSION,
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
    if (this.waitingAck) {
      return;
    }
    this.waitingAck = true;
    this.sendPendingMessage();
  }

  /**
   * Send the next pending message
   */
  private sendPendingMessage() {
    let message = this.pendingMessages[0];
    if (!message) return;
    if (message.type === "REMOTE_REVISION") {
      const revision = this.revisions.get(message.nextRevisionId);
      if (revision.commands.length === 0) {
        /**
         * The command is empty, we have to drop all the next local revisions
         * to avoid issues with undo/redo
         */
        this.revisions.drop(revision.id);
        const revisionIds = this.pendingMessages
          .filter((message) => message.type === "REMOTE_REVISION")
          .map((message) => message.nextRevisionId);
        this.trigger("pending-revisions-dropped", { revisionIds });
        this.waitingAck = false;
        this.waitingUndoRedoAck = false;
        this.pendingMessages = [];
        return;
      }
      message = {
        ...message,
        clientId: revision.clientId,
        commands: revision.commands,
      };
    }
    if (this.isReplayingInitialRevisions) {
      throw new Error(`Trying to send a new revision while replaying initial revision. This can lead to endless dispatches every time the spreadsheet is open.
      ${JSON.stringify(message)}`);
    }
    this.transportService.sendMessage({
      ...message,
      serverRevisionId: this.serverRevisionId,
    });
  }

  private acknowledge(message: CollaborationMessage) {
    if (message.type === "REVISION_UNDONE" || message.type === "REVISION_REDONE") {
      this.waitingUndoRedoAck = false;
    }
    switch (message.type) {
      case "REMOTE_REVISION":
      case "REVISION_REDONE":
      case "REVISION_UNDONE":
      case "SNAPSHOT_CREATED":
        this.waitingAck = false;
        this.pendingMessages = this.pendingMessages.filter(
          (msg) => msg.nextRevisionId !== message.nextRevisionId
        );
        this.serverRevisionId = message.nextRevisionId;
        this.processedRevisions.add(message.nextRevisionId);
        this.sendPendingMessage();
        break;
    }
  }

  private isAlreadyProcessed(message: CollaborationMessage): boolean {
    if (message.type === "CLIENT_MOVED" && message.client.id === this.clientId) {
      return true;
    }
    switch (message.type) {
      case "REMOTE_REVISION":
      case "REVISION_REDONE":
      case "REVISION_UNDONE":
        return this.processedRevisions.has(message.nextRevisionId);
      default:
        return false;
    }
  }

  isWrongServerRevisionId(message: CollaborationMessage) {
    switch (message.type) {
      case "REMOTE_REVISION":
      case "REVISION_REDONE":
      case "REVISION_UNDONE":
      case "SNAPSHOT_CREATED":
        return message.serverRevisionId !== this.serverRevisionId;
      default:
        return false;
    }
  }

  private dropPendingHistoryMessages() {
    this.waitingUndoRedoAck = false;
    this.pendingMessages = this.pendingMessages.filter(
      ({ type }) => type !== "REVISION_REDONE" && type !== "REVISION_UNDONE"
    );
  }
}
