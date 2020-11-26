import { WHistory } from "../../history";
import { ModelConfig } from "../../model";
import { SOCT4 } from "../../soct4";
import { Command, CommandDispatcher, CommandResult, CoreGetters } from "../../types";
import { CorePlugin } from "../core_plugin";

export class NetworkPlugin extends CorePlugin {
  protected soct4?: SOCT4;
  private isMultiuser: boolean = false;

  constructor(
    getters: CoreGetters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(getters, history, dispatch, config);
    if (config.network) {
      this.soct4 = new SOCT4(this.dispatch.bind(this), config.network);
    }
  }

  allowDispatch(cmd: Command): CommandResult {
    this.isMultiuser = false;
    if (cmd.type === "EXTERNAL") {
      this.isMultiuser = true;
    }
    return { status: "SUCCESS" };
  }

  handle(cmd: Command) {
    if (!this.isMultiuser && this.soct4) {
      if (cmd.type === "UPDATE_CELL" || cmd.type === "CREATE_SHEET" || cmd.type === "CLEAR_CELL") {
        this.soct4.localExecution(cmd);
      }
    }
    switch (cmd.type) {
      case "EXTERNAL":
        for (let command of cmd.commands) {
          this.dispatch(command.type, command);
        }
        break;
    }
  }
}
