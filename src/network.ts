import { uuidv4 } from "./helpers/uuid";
import { ModelConfig } from "./model";
import { Command, CommandDispatcher, CommandResult, CoreCommand, UID } from "./types";
import { Message } from "./types/multi_users";

export class StateReplicator2000 {

  startTransaction(command: Command, transactionId: UID) {}

  addStep(command: CoreCommand) {}

  finalizeTransaction() {}

  allowDispatch(): CommandResult {
    return { status: "SUCCESS" };
  }
  beforeHandle() {}
  handle(cmd: Command) {}
  finalize() {}
}
