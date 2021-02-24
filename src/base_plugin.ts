import { WHistory, WorkbookHistory } from "./history";
import { Mode, ModelConfig } from "./model";
import {
  Command,
  CommandDispatcher,
  CommandHandler,
  CommandResult,
  Getters,
  GridRenderingContext,
  LAYERS,
  Workbook,
  WorkbookData,
} from "./types/index";

type UIActions = Pick<ModelConfig, "askConfirmation" | "notifyUser" | "openSidePanel" | "editText">;
/**
 * BasePlugin
 *
 * Since the spreadsheet internal state is quite complex, it is split into
 * multiple parts, each managing a specific concern.
 *
 * This file introduce the BasePlugin, which is the common class that defines
 * how each of these model sub parts should interact with each other.
 */

export class BasePlugin implements CommandHandler {
  static layers: LAYERS[] = [];
  static getters: string[] = [];
  static modes: Mode[] = ["headless", "normal", "readonly"];

  protected workbook: Workbook;
  protected getters: Getters;
  protected history: WorkbookHistory;
  protected dispatch: CommandDispatcher["dispatch"];
  protected currentMode: Mode;
  protected ui: UIActions;

  constructor(
    workbook: Workbook,
    getters: Getters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    this.workbook = workbook;
    this.getters = getters;
    this.history = Object.assign(Object.create(history), {
      updateLocalState: history.updateStateFromRoot.bind(history, this),
    });
    this.dispatch = dispatch;
    this.currentMode = config.mode;
    this.ui = config;
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
  allowDispatch(command: Command): CommandResult {
    return { status: "SUCCESS" };
  }

  /**
   * This method is useful when a plugin need to perform some action before a
   * command is handled in another plugin. This should only be used if it is not
   * possible to do the work in the handle method.
   */
  beforeHandle(command: Command): void {}

  /**
   * This is the standard place to handle any command. Most of the plugin
   * command handling work should take place here.
   */
  handle(command: Command): void {}

  /**
   * Sometimes, it is useful to perform some work after a command (and all its
   * subcommands) has been completely handled.  For example, when we paste
   * multiple cells, we only want to reevaluate the cell values once at the end.
   */
  finalize(command: Command): void {}

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(ctx: GridRenderingContext, layer: LAYERS) {}

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}
}
