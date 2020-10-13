import { WHistory } from "../../history";
import { Mode, ModelConfig } from "../../model";
import {
  Command,
  CommandDispatcher,
  CommandHandler,
  CommandResult,
  Getters,
  GridRenderingContext,
  LAYERS,
} from "../../types";
import { AbstractPlugin } from "../abstract_plugin";

type UIActions = Pick<ModelConfig, "askConfirmation" | "notifyUser" | "openSidePanel" | "editText">;

export class UIPlugin extends AbstractPlugin implements CommandHandler {
  static layers: LAYERS[] = [];
  protected getters: Getters;
  protected dispatch: CommandDispatcher["dispatch"];
  protected ui: UIActions;

  constructor(
    getters: Getters,
    history: WHistory,
    currentMode: Mode,
    dispatch: CommandDispatcher["dispatch"],
    ui: ModelConfig
  ) {
    super(history, currentMode);
    this.getters = getters;
    this.dispatch = dispatch;
    this.ui = ui;
  }

  allowDispatch(command: Command): CommandResult {
    return { status: "SUCCESS" };
  }
  beforeHandle(command: Command): void {}
  handle(command: Command): void {}
  finalize(command: Command): void {}

  drawGrid(ctx: GridRenderingContext, layer: LAYERS) {}
}
