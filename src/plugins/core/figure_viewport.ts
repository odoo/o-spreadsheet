import {
  CommandResult,
  CoreCommand,
  DOMCoordinates,
  Figure,
  FigureSize,
  FigureViewport,
  UID,
  WorkbookData,
} from "../../types/index";
import { CorePlugin, CorePluginConfig } from "../core_plugin";

interface State {
  readonly figureViewports: Record<UID, Record<UID, FigureViewport | undefined> | undefined>;
}

export class FigureViewportPlugin extends CorePlugin<State> implements State {
  static getters = ["getFigureViewport"] as const;
  readonly figureViewports: Record<UID, Record<UID, FigureViewport | undefined> | undefined> = {};

  constructor(config: CorePluginConfig) {
    super(config);
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_FIGURE_VIEWPORT":
        if (this.getters.getFigure(cmd.sheetId, cmd.figureId)) {
          return CommandResult.InvalidFigureId;
        }
        return CommandResult.Success;
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_FIGURE_VIEWPORT":
        this.addFigure(cmd.figureId, cmd.sheetId, cmd.position, cmd.size);
        const viewportDefinition: FigureViewport = { zone: cmd.zone, ...cmd.definition };
        this.history.update("figureViewports", cmd.sheetId, cmd.figureId, viewportDefinition);
        break;
      case "DUPLICATE_SHEET": {
        // ADRM TODO
        break;
      }
      case "DELETE_FIGURE":
        this.history.update("figureViewports", cmd.sheetId, cmd.id, undefined);
        break;
      case "DELETE_SHEET":
        this.history.update("figureViewports", cmd.sheetId, undefined);
        break;
    }
  }

  getFigureViewport(sheetId: UID, figureId: UID): FigureViewport {
    const figureViewport = this.figureViewports[sheetId]?.[figureId];
    if (!figureViewport) {
      throw new Error(`FigureViewport not found for sheetId: ${sheetId} and figureId: ${figureId}`);
    }
    return figureViewport;
  }

  private addFigure(id: UID, sheetId: UID, position: DOMCoordinates, size: FigureSize) {
    const figure: Figure = {
      id,
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      tag: "viewport",
    };
    this.dispatch("CREATE_FIGURE", { sheetId, figure });
  }

  import(data: WorkbookData) {
    // ADRM TODO
  }

  export(data: WorkbookData) {
    // ADRM TODO
  }
}
