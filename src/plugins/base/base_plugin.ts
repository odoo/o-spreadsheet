import { WHistory } from "../../history";
import { Mode, ModelConfig } from "../../model";
import {
  BaseGetters,
  WorkbookData,
  CommandDispatcher,
  CommandHandler,
  Command,
  CommandResult,
  CommandTypes,
  EventDispatcher,
} from "../../types";
import { AbstractPlugin } from "../abstract_plugin";

// TODO REMOVE ME
type UIActions = Pick<ModelConfig, "askConfirmation" | "notifyUser" | "openSidePanel" | "editText">;

export class BasePlugin extends AbstractPlugin implements CommandHandler {
  protected dispatch: CommandDispatcher["dispatch"];
  protected ui: UIActions;
  protected getters: BaseGetters;
  protected bus: EventDispatcher;

  constructor(
    getters: BaseGetters,
    history: WHistory,
    currentMode: Mode,
    dispatch: CommandDispatcher["dispatch"], // TODO REMOVE ME
    ui: ModelConfig, // TODO REMOVE ME
    bus: EventDispatcher
  ) {
    super(history, currentMode);
    this.getters = getters;
    this.dispatch = (type: CommandTypes, payload?: any): CommandResult => {
      //console.warn("'dispatch' is deprecated on BasePlugin");
      return dispatch(type, payload);
    };
    this.ui = ui;
    this.bus = bus;
    this.registerListener();
  }

  // To be overrided to add listener on the bus
  protected registerListener() {}

  //TODO REMOVE INTERFACE COMMANDHANDLER AND ALL METHOD
  allowDispatch(command: Command): CommandResult {
    return { status: "SUCCESS" };
  }
  handle(command: Command): void {} //TODO REMOVE ME
  finalize(command: Command): void {} //TODO REMOVE ME

  beforeHandle(cmd: Command) {} //TODO REMOVE ME

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}
}
