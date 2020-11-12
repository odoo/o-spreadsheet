import { BasePlugin } from "../base_plugin";
import { WHistory } from "../history";
import { Mode, ModelConfig } from "../model";
import { AddMergeEvent, Command, CommandDispatcher, CommandResult, Event, Getters } from "../types";

export class MultiUserPlugin extends BasePlugin {
  static getters = [];
  static modes: Mode[] = ["normal", "readonly"];
  private sendCommand: (command: Command) => void;
  private events: Event[] | null = null;

  constructor(
    getters: Getters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(getters, history, dispatch, config);
    this.sendCommand = config.network.sendCommand;
    this.bus.on("add-merge", this, (ev: AddMergeEvent) => {
      if (this.events) {
        // @ts-ignore
        this.events.push({ type: "add-merge", ...ev });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(command: Command): CommandResult {
    if (command.type !== "MULTIUSER") {
      this.events = [];
    }
    return { status: "SUCCESS" };
  }

  handle(cmd: Command) {
    if (cmd.type === "MULTIUSER") {
      console.table(cmd.events);
      const events = cmd.events;
      for (let event of events) {
        this.bus.trigger(event.type, event);
      }
    }
  }

  finalize() {
    if (this.events && this.events.length > 0) {
      this.sendCommand({ type: "MULTIUSER", events: this.events });
    }
    this.events = null;
  }
}
