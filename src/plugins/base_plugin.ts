import { Mode, ModelConfig } from "../model";
import { StateObserver } from "../state_observer";
import { CommandDispatcher, CommandHandler, CommandResult, WorkbookHistory } from "../types/index";

/**
 * BasePlugin
 *
 * Since the spreadsheet internal state is quite complex, it is split into
 * multiple parts, each managing a specific concern.
 *
 * This file introduce the BasePlugin, which is the common class that defines
 * how each of these model sub parts should interact with each other.
 * There are two kind of plugins: core plugins handling persistent data
 * and UI plugins handling transient data.
 */

export class BasePlugin<State = any, C = any> implements CommandHandler<C> {
  static getters: string[] = [];
  static modes: Mode[] = ["headless", "normal", "readonly"];

  protected history: WorkbookHistory<State>;
  protected dispatch: CommandDispatcher["dispatch"];
  protected currentMode: Mode;

  constructor(
    stateObserver: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    this.history = Object.assign(Object.create(stateObserver), {
      update: stateObserver.addChange.bind(stateObserver, this),
      selectCell: () => {},
    });
    this.dispatch = dispatch;
    this.currentMode = config.mode;
  }

  // ---------------------------------------------------------------------------
  // Command handling
  // ---------------------------------------------------------------------------

  /**
   * Before a command is accepted, the model will ask each plugin if the command
   * is allowed.  If all of then return true, then we can proceed. Otherwise,
   * the command is cancelled.
   *
   * There should not be any side effects in this method.
   */
  allowDispatch(command: C): CommandResult {
    return CommandResult.Success;
  }

  /**
   * This method is useful when a plugin need to perform some action before a
   * command is handled in another plugin. This should only be used if it is not
   * possible to do the work in the handle method.
   */
  beforeHandle(command: C): void {}

  /**
   * This is the standard place to handle any command. Most of the plugin
   * command handling work should take place here.
   */
  handle(command: C): void {}

  /**
   * Sometimes, it is useful to perform some work after a command (and all its
   * subcommands) has been completely handled.  For example, when we paste
   * multiple cells, we only want to reevaluate the cell values once at the end.
   */
  finalize(): void {}
}
