import { ModelConfig } from "../../model";
import { SOCT4 } from "../../soct4";
import { Command, CommandDispatcher, CommandResult, CoreCommand } from "../../types";

export class NetworkPlugin {
  protected soct4?: SOCT4;
  private isMultiuser: boolean = false;
  private stack: CoreCommand[] = [];

  constructor(protected dispatch: CommandDispatcher["dispatch"], network: ModelConfig["network"]) {
    if (network) {
      this.soct4 = new SOCT4(dispatch, network);
    }
  }

  startTransaction(command: Command) {
    if (command.type === "EXTERNAL") {
      this.isMultiuser = true;
    } else {
      this.stack = [];
    }
  }
  addStep(command: CoreCommand) {
    if (!this.isMultiuser) {
      this.stack.push(command);
    }
  }

  finalizeTransaction() {
    if (this.soct4 && !this.isMultiuser && this.stack.length > 0) {
      this.soct4.localExecution(this.stack);
      this.stack = [];
    }
    this.isMultiuser = false;
  }

  allowDispatch(): CommandResult {
    return { status: "SUCCESS" };
  }
  beforeHandle() {}
  handle(cmd: Command) {
    if (cmd.type === "EXTERNAL") {
      for (let command of cmd.commands) {
        this.dispatch(command.type, command);
      }
    }
  }
  finalize() {}

  // allowDispatch(cmd: Command): CommandResult {
  //   this.isMultiuser = false;
  //   if (cmd.type === "EXTERNAL") {
  //     this.isMultiuser = true;
  //   }
  //   return { status: "SUCCESS" };
  // }

  // handle(cmd: Command) {
  //   if (!this.isMultiuser && this.soct4) {
  //     if (cmd.type === "UPDATE_CELL" || cmd.type === "CREATE_SHEET" || cmd.type === "CLEAR_CELL") {
  //       this.soct4.localExecution(cmd);
  //     }
  //   }
  //   switch (cmd.type) {
  //     case "EXTERNAL":
  //       for (let command of cmd.commands) {
  //         this.dispatch(command.type, command);
  //       }
  //       break;
  //   }
  // }
}
