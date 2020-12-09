import { uuidv4 } from "./helpers/uuid";
import { CoreCommand, CommandDispatcher, UID } from "./types";
import { Message, Network } from "./types/multi_users";

/**
 */
export class SOCT4 {
  private readonly clientId = uuidv4();

  constructor(private dispatch: CommandDispatcher["dispatch"], private network: Network) {
    this.network.onNewMessage(this.clientId, (message: Required<Message>) => {
      if (message.clientId === this.clientId) {
        return;
      }
      this.dispatch("EXTERNAL", {
        commands: message.commands,
        transactionId: message.transactionId,
      });
    });
  }

  /**
   * Called whenever a local command is generated.
   */
  async localExecution(commands: CoreCommand[], transactionId: UID) {
    this.network.sendMessage({
      clientId: this.clientId,
      commands,
      timestamp: -1,
      transactionId,
    });
  }
}
