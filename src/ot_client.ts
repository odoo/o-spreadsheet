import { uuidv4 } from "./helpers/index";
import { Model } from "./model";
import { transform } from "./ot/ot";
import { Command, OTAck, OTCommand, OTMessage, OTResponse, UID } from "./types/index";

// TODO Manage multi-command

export class OtClient {
  private revision: number;
  private pendingChanges: Command[] = [];
  private sentChanges: Command[] = [];
  private send: (message: OTMessage) => void;
  private model: Model;
  private clientId: UID = uuidv4();

  constructor(revision: number, send: (message: OTMessage) => void, model: Model) {
    this.revision = revision;
    this.send = send;
    this.model = model;
  }

  localCommand(command: Command) {
    this.pendingChanges.push(command);
    this.processPending();
  }

  processPending() {
    if (this.sentChanges.length === 0 && this.pendingChanges.length > 0) {
      const command = this.pendingChanges.shift()!;
      this.sentChanges.push(command);
      this.send({ command, revision: this.revision + 1, clientId: this.clientId });
    }
  }

  onReceived(message: OTResponse) {
    if (message.type === "ACK") {
      this.onAckReceived(message);
    } else {
      this.commandReceived(message);
    }
  }

  onAckReceived(message: OTAck) {
    this.revision = message.revision;
    this.sentChanges.pop();
    this.processPending();
  }

  commandReceived(message: OTCommand) {
    this.revision = message.revision;
    for (let id in this.pendingChanges) {
      const command = transform(this.pendingChanges[id], message.command, this.model.getters);
      this.pendingChanges[id] = command[0];
    }
    this.model.dispatch(message.command.type, message.command);
  }
}
