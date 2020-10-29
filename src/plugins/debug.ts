import { BasePlugin } from "../base_plugin";
import { WHistory } from "../history";
import { ModelConfig, Mode } from "../model";
import { Command, CommandDispatcher, CommandResult, Getters } from "../types";
import { Message, Network } from "../types/multi_user";

export interface CommandDebug {
  type: "command";
  commands: Command[];
}

export interface MessageDebug {
  type: "network-message";
  message: Message;
}

type DebugStep = CommandDebug | MessageDebug;

export class DebugPlugin extends BasePlugin {
  static getters = ["getDebugSteps"];
  static modes: Mode[] = ["normal", "readonly"];

  private network?: Network;

  private debugSteps: DebugStep[] = [];
  private currentDispatch: Command[] = [];

  constructor(
    getters: Getters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(getters, history, dispatch, config);
    const { synchronizedState } = config;
    if (synchronizedState) {
      // @ts-ignore
      this.network = synchronizedState.network! as Network;
      this.network.onNewMessage("debug", (message: Message) => {
        this.debugSteps.push({
          type: "network-message",
          message,
        });
      });
      // synchronizedState.apply = (updates: Update[]) => {
      //   this.updates.push(updates);
      //   synchronizedState.apply(updates);
      // };
    }
  }

  allowDispatch(): CommandResult {
    this.currentDispatch = [];
    this.debugSteps.push({
      type: "command",
      commands: this.currentDispatch,
    });
    return { status: "SUCCESS" };
  }

  handle(command: Command) {
    this.currentDispatch.push(command);
  }

  getDebugSteps() {
    return [...this.debugSteps].reverse();
  }
}
