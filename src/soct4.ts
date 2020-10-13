import { uuidv4 } from "./helpers/uuid";
import { Model } from "./model";
import { transform } from "./ot/ot";
import { NetworkCommand, Command } from "./types";

/**
 * SOCT4 implementation
 * Vidot, Nicolas & Cart, Michèle & Ferrié, Jean & Suleiman, Maher. (2000).
 * Copies convergence in a distributed real-time collaborative environment. 171-180. 10.1145/358916.358988.
 * https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.63.1665&rep=rep1&type=pdf
 */
export class SOCT4 {
  private readonly clientId = uuidv4();
  private currentTimestamp: number = 0;
  private lastDeliveredTimestamp: number = 0;
  private history: { [timestamp: number]: NetworkCommand } = {};
  private sequencialReceptionQueue: Required<NetworkCommand>[] = [];
  private getTicket: () => Promise<number>;

  private model: Model;
  private broadcast: (newtworkCommand: NetworkCommand) => any;

  constructor(
    model: Model,
    broadcast: (newtworkCommand: NetworkCommand) => any,
    getTicket: () => Promise<number>
  ) {
    this.model = model;
    this.broadcast = broadcast;
    this.getTicket = getTicket;
  }

  /**
   * Called whenever a local command is generated. It is stored at the end of the history.
   * When the command receives its timestamp it is checked to
   * determine whether it can be broadcast.
   */
  async localExecution(command: Command) {
    this.currentTimestamp++;
    const networkCommand: NetworkCommand = {
      clientId: this.clientId,
      commands: [command],
      timestamp: undefined,
    };
    this.history[this.currentTimestamp] = networkCommand;
    networkCommand.timestamp = await this.getTicket();
    this.deferredBroadcast();
  }

  /**
   * Broadcast the first local command if all other
   * operations with lower value of timestamp have been delivered.
   */
  private deferredBroadcast() {
    // We should manage the case where the network is down
    const nextTimestamp = this.lastDeliveredTimestamp + 1;
    const networkCommand = this.history[nextTimestamp];
    if (networkCommand && networkCommand.timestamp === nextTimestamp) {
      this.broadcast(networkCommand);
      // remove from history ?
    }
  }

  /**
   * Called
   */
  private integrateCommand(networkCommand: NetworkCommand) {
    if (networkCommand.clientId === this.clientId) {
      this.deferredBroadcast();
      return;
    }
    let commands = networkCommand.commands;
    // local operations waiting to be broadcast are shifted one place to the right
    for (let j = this.currentTimestamp; j >= this.lastDeliveredTimestamp; j--) {
      this.history[j + 1] = this.history[j];
    }
    this.history[this.lastDeliveredTimestamp] = networkCommand;
    this.currentTimestamp++;
    // The command is transformed with the local ones, and the resulting transformed
    // command is executed.
    // Meanwhile, each local operation waiting for broadcast is in turn forward transposed to take
    // into account this new concurrent operation
    for (let j = this.lastDeliveredTimestamp + 1; j < this.currentTimestamp; j++) {
      // TODO clean this and check it is correct
      const localCommands = this.history[j].commands;
      this.history[j].commands = commands
        .map((command) =>
          localCommands
            .map((localCommand) => transform(command, localCommand, this.model.getters))
            .flat()
        )
        .flat();
      commands = commands
        .map((command) =>
          localCommands
            .map((localCommand) => transform(localCommand, command, this.model.getters))
            .flat()
        )
        .flat();
    }
    for (let command of commands) {
      this.model.dispatch(command.type, command, true);
    }
    this.deferredBroadcast();
  }

  /**
   * Handle the delivery of commands.
   * Ensures a sequential delivery of operations
   * with respect to the ascending order of the timestamps.
   * Upon receiving a command, its delivery is delayed until all
   * the operations with lower timestamps have been received and delivered.
   */
  sequentialReception(networkCommand: Required<NetworkCommand>) {
    // wait all previous commands before integrating the new command
    this.sequencialReceptionQueue.push(networkCommand);
    this.sequencialReceptionQueue.sort(
      (command1, command2) => command1.timestamp - command2.timestamp
    );
    let i = 0;
    while (i < this.sequencialReceptionQueue.length) {
      const waitingCommand = this.sequencialReceptionQueue[i];
      if (
        waitingCommand.timestamp &&
        this.lastDeliveredTimestamp === waitingCommand.timestamp - 1
      ) {
        this.sequencialReceptionQueue.splice(i, 1);
        this.lastDeliveredTimestamp++;
        this.integrateCommand(waitingCommand);
      } else {
        i++;
      }
    }
  }
}
