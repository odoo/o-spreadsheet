import { uuidv4 } from "./helpers/uuid";
import { transform } from "./ot/ot";
import { CoreCommand, CommandDispatcher, UID } from "./types";
import { Message, Network } from "./types/multi_users";

/**
 * SOCT4 implementation
 * Vidot, Nicolas & Cart, Michèle & Ferrié, Jean & Suleiman, Maher. (2000).
 * Copies convergence in a distributed real-time collaborative environment. 171-180. 10.1145/358916.358988.
 * https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.63.1665&rep=rep1&type=pdf
 */
export class SOCT4 {
  private readonly clientId = uuidv4();
  // private currentTimestamp: number = 0;
  // private lastDeliveredTimestamp: number = 0;
  // private history: { [timestamp: number]: Message } = {};
  // private sequencialReceptionQueue: Required<Message>[] = [];
  private queue: Message[] = [];

  constructor(private dispatch: CommandDispatcher["dispatch"], private network: Network) {
    this.network.onNewMessage(this.clientId, (message: Required<Message>) => {
      this.sequentialReception(message);
    });
  }

  /**
   * Called whenever a local command is generated. It is stored at the end of the history.
   * When the command receives its timestamp it is checked to
   * determine whether it can be broadcast.
   */
  async localExecution(commands: CoreCommand[], transactionId: UID) {
    // this.currentTimestamp++;
    const networkCommand: Message = {
      clientId: this.clientId,
      commands,
      timestamp: -1,
      transactionId,
    };
    // this.history[this.currentTimestamp] = networkCommand;
    this.queue.push(networkCommand);
    // networkCommand.timestamp = await this.network.getTicket();
    // console.table(this.history);
    this.deferredBroadcast();
  }

  /**
   * Broadcast the first local command if all other
   * operations with lower value of timestamp have been delivered.
   */
  private deferredBroadcast() {
    // We should manage the case where the network is down
    // const nextTimestamp = this.lastDeliveredTimestamp + 1;
    // const networkCommand = this.history[nextTimestamp];
    const networkCommand = this.queue[0];
    // if (networkCommand && networkCommand.timestamp === nextTimestamp) {
    if (networkCommand) {
      this.network.sendMessage(networkCommand);
      this.queue.shift();
    }
    // }
  }

  /**
   * Called
   */
  private integrateCommand(networkCommand: Message) {
    if (networkCommand.clientId === this.clientId) {
      this.deferredBroadcast();
      return;
    }
    let commands = networkCommand.commands;
    // local operations waiting to be broadcast are shifted one place to the right
    // this.queue.unshift(networkCommand);

    // for (let j = this.currentTimestamp; j >= this.lastDeliveredTimestamp; j--) {
    //   this.history[j + 1] = this.history[j];
    // }
    // this.history[this.lastDeliveredTimestamp] = networkCommand;
    // this.currentTimestamp++;
    // The command is transformed with the local ones, and the resulting transformed
    // command is executed.
    // Meanwhile, each local operation waiting for broadcast is in turn forward transposed to take
    // into account this new concurrent operation

    for (let j = 0; j < this.queue.length; j++) {
      const localCommandsAlreadyExecuted = this.queue[j].commands;

      // UpdateB1 (local) and AddColA (network)
      // this.queue[0] = UpdateC1

      // Local non-sent commands should be transform
      this.queue[j].commands = commands
        .map((command) =>
          localCommandsAlreadyExecuted
            .map((localCommand) =>
              transform(localCommand, command, this.queue[j].timestamp, networkCommand.timestamp)
            )
            .flat()
        )
        .flat();

      // UpdateB1 (local) and AddColA (network)
      // AddColA

      // Received command should be transform with the local non-sent commands
      commands = commands
        .map((command) =>
          localCommandsAlreadyExecuted
            .map(
              (localCommand) =>
                transform(command, localCommand, networkCommand.timestamp, this.queue[j].timestamp) // probably broken; this.queue[j].timestamp could be -1
            )
            .flat()
        )
        .flat();
    }

    // for (let j = this.lastDeliveredTimestamp + 1; j < this.currentTimestamp; j++) {
    //   // TODO clean this and check it is correct
    //   const localCommands = this.history[j].commands;

    //   // Local non-sent commands should be transform
    //   this.history[j].commands = commands
    //     .map((command) =>
    //       localCommands.map((localCommand) => transform(command, localCommand)).flat()
    //     )
    //     .flat();

    //   // Received command should be transform with the local non-sent commands
    //   commands = commands
    //     .map((command) =>
    //       localCommands.map((localCommand) => transform(localCommand, command)).flat()
    //     )
    //     .flat();
    // }
    this.dispatch("EXTERNAL", { commands, transactionId: networkCommand.transactionId });
    this.deferredBroadcast();
  }

  /**
   * Handle the delivery of commands.
   * Ensures a sequential delivery of operations
   * with respect to the ascending order of the timestamps.
   * Upon receiving a command, its delivery is delayed until all
   * the operations with lower timestamps have been received and delivered.
   */
  private sequentialReception(networkCommand: Message) {
    // wait all previous commands before integrating the new command

    this.integrateCommand(networkCommand);

    // this.sequencialReceptionQueue.push(networkCommand);
    // this.sequencialReceptionQueue.sort(
    //   (command1, command2) => command1.timestamp - command2.timestamp
    // );
    // let i = 0;
    // while (i < this.sequencialReceptionQueue.length) {
    //   const waitingCommand = this.sequencialReceptionQueue[i];
    //   if (
    //     waitingCommand.timestamp &&
    //     this.lastDeliveredTimestamp === waitingCommand.timestamp - 1
    //   ) {
    //     this.sequencialReceptionQueue.splice(i, 1);
    //     this.lastDeliveredTimestamp++;
    //     this.integrateCommand(waitingCommand);
    //   } else {
    //     i++;
    //   }
    // }
  }
}
