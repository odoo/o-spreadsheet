import { WHistory } from "../../history";
import { Mode, ModelConfig } from "../../model";
import {
  EventDispatcher,
  EventHandler,
  BaseGetters,
  Event,
  WorkbookData,
  CommandDispatcher,
  CommandHandler,
  Command,
  CommandResult,
  CommandTypes,
} from "../../types";
import { AbstractPlugin } from "../abstract_plugin";

// TODO REMOVE ME
type UIActions = Pick<ModelConfig, "askConfirmation" | "notifyUser" | "openSidePanel" | "editText">;

export class BasePlugin extends AbstractPlugin implements EventHandler, CommandHandler {
  protected dispatchEvent: EventDispatcher["dispatchEvent"];
  protected dispatch: CommandDispatcher["dispatch"];
  protected ui: UIActions;
  protected getters: BaseGetters;

  constructor(
    getters: BaseGetters,
    history: WHistory,
    currentMode: Mode,
    dispatchEvent: EventDispatcher["dispatchEvent"],
    dispatch: CommandDispatcher["dispatch"], // TODO REMOVE ME
    ui: ModelConfig // TODO REMOVE ME
  ) {
    super(history, currentMode);
    this.getters = getters;
    this.dispatchEvent = dispatchEvent;
    this.dispatch = (type: CommandTypes, payload?: any): CommandResult => {
      //console.warn("'dispatch' is deprecated on BasePlugin");
      return dispatch(type, payload);
    };
    this.ui = ui;
  }
  //TODO REMOVE INTERFACE COMMANDHANDLER AND ALL METHOD
  allowDispatch(command: Command): CommandResult {
    return { status: "SUCCESS" };
  }
  handle(command: Command): void {} //TODO REMOVE ME
  finalize(command: Command): void {} //TODO REMOVE ME

  beforeHandle(cmd: Command) {} //TODO REMOVE ME

  handleEvent(event: Event): void {}

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}
}
