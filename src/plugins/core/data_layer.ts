import { FIGURE_ID_SPLITTER } from "../../constants";
import { deepCopy } from "../../helpers/misc";
import { UuidGenerator } from "../../helpers/uuid";
import { CommandResult, CoreCommand } from "../../types/commands";
import { DataLayerDefinition } from "../../types/data_layer";
import { FigureSize } from "../../types/figure";
import { HeaderIndex, PixelPosition, UID } from "../../types/misc";
import { DOMDimension } from "../../types/rendering";
import { WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

interface FigureDataLayer {
  figureId: UID;
  definition: DataLayerDefinition;
}

interface DataLayerState {
  readonly dataLayers: Record<UID, FigureDataLayer | undefined>;
}

export class DataLayerPlugin extends CorePlugin<DataLayerState> implements DataLayerState {
  static getters = [
    "getDataLayer",
    "doesDataLayerExist",
    "getFigureIdFromDataLayerId",
    "getDataLayerIds",
  ] as const;
  readonly dataLayers: Record<UID, FigureDataLayer | undefined> = {};

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_DATA_LAYER":
        if (this.dataLayers[cmd.dataLayerId]) {
          return CommandResult.DuplicatedFigureId;
        }
        // If the figure doesn't exist, position info is required to create it
        if (!this.getters.getFigure(cmd.sheetId, cmd.figureId)) {
          if (cmd.offset === undefined || cmd.col === undefined || cmd.row === undefined) {
            return CommandResult.MissingFigureArguments;
          }
        }
        return CommandResult.Success;
      case "UPDATE_DATA_LAYER":
        if (!this.dataLayers[cmd.dataLayerId]) {
          return CommandResult.InvalidFigureId;
        }
        return CommandResult.Success;
      case "DELETE_DATA_LAYER":
        return CommandResult.SubCommandOnly;
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_DATA_LAYER": {
        const { col, row, offset, size, sheetId, figureId } = cmd;
        if (
          !this.getters.getFigure(sheetId, figureId) &&
          offset !== undefined &&
          col !== undefined &&
          row !== undefined
        ) {
          this.addFigure(figureId, sheetId, col, row, offset, size);
        }
        this.history.update("dataLayers", cmd.dataLayerId, {
          figureId: cmd.figureId,
          definition: cmd.definition,
        });
        break;
      }
      case "UPDATE_DATA_LAYER":
        if (this.dataLayers[cmd.dataLayerId]) {
          this.history.update("dataLayers", cmd.dataLayerId, {
            ...this.dataLayers[cmd.dataLayerId]!,
            definition: cmd.definition,
          });
        }
        break;
      case "DELETE_DATA_LAYER":
        if (this.dataLayers[cmd.dataLayerId]) {
          this.history.update("dataLayers", cmd.dataLayerId, undefined);
        }
        break;
      case "DUPLICATE_SHEET": {
        // Only duplicate standalone data layers (tag === "dataLayer").
        // Carousel-owned data layers are handled by CarouselPlugin.
        const sheetFiguresFrom = this.getters.getFigures(cmd.sheetId);
        for (const fig of sheetFiguresFrom) {
          if (fig.tag === "dataLayer") {
            const figureIdBase = fig.id.split(FIGURE_ID_SPLITTER).pop();
            const duplicatedFigureId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${figureIdBase}`;
            // Find the dataLayerId for this standalone figure (dataLayerId === figureId)
            const dataLayerId = Object.keys(this.dataLayers).find(
              (id) => this.dataLayers[id]?.figureId === fig.id
            );
            if (dataLayerId) {
              const definition = this.dataLayers[dataLayerId]!.definition;
              const dlIdBase = dataLayerId.split(FIGURE_ID_SPLITTER).pop();
              const duplicatedDlId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${dlIdBase}`;
              const size: FigureSize = { width: fig.width, height: fig.height };
              this.dispatch("CREATE_DATA_LAYER", {
                sheetId: cmd.sheetIdTo,
                figureId: duplicatedFigureId,
                dataLayerId: duplicatedDlId,
                offset: fig.offset,
                col: fig.col,
                row: fig.row,
                size,
                definition: deepCopy(definition),
              });
            }
          }
        }
        break;
      }
      case "DELETE_FIGURE":
        for (const dataLayerId in this.dataLayers) {
          if (this.dataLayers[dataLayerId]?.figureId === cmd.figureId) {
            this.dispatch("DELETE_DATA_LAYER", { dataLayerId, sheetId: cmd.sheetId });
          }
        }
        break;
      case "DELETE_SHEET":
        for (const dataLayerId of this.getDataLayerIds(cmd.sheetId)) {
          this.history.update("dataLayers", dataLayerId, undefined);
        }
        break;
    }
  }

  getDataLayer(dataLayerId: UID): DataLayerDefinition {
    if (!this.dataLayers[dataLayerId]) {
      throw new Error(`There is no data layer with the given id: ${dataLayerId}`);
    }
    return this.dataLayers[dataLayerId].definition;
  }

  doesDataLayerExist(dataLayerId: UID): boolean {
    return dataLayerId in this.dataLayers && this.dataLayers[dataLayerId] !== undefined;
  }

  getFigureIdFromDataLayerId(dataLayerId: UID): UID {
    if (!this.dataLayers[dataLayerId]) {
      throw new Error(`Data layer with id ${dataLayerId} does not exist.`);
    }
    return this.dataLayers[dataLayerId].figureId;
  }

  getDataLayerIds(sheetId: UID): UID[] {
    return Object.entries(this.dataLayers)
      .filter(([, entry]) => {
        if (!entry) {
          return false;
        }
        const figSheetId = this.getters.getFigureSheetId(entry.figureId);
        return figSheetId === sheetId;
      })
      .map(([id]) => id);
  }

  private addFigure(
    figureId: UID,
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    offset: PixelPosition,
    size: DOMDimension
  ) {
    this.dispatch("CREATE_FIGURE", { sheetId, figureId, col, row, offset, size, tag: "dataLayer" });
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      if (!sheet.figures) {
        continue;
      }
      for (const figure of sheet.figures) {
        if (figure.tag === "dataLayer") {
          // Standalone data layer: dataLayerId === figureId
          this.dataLayers[figure.id] = {
            figureId: figure.id,
            definition: figure.data,
          };
        } else if (figure.tag === "carousel") {
          // New format: read from dataLayerDefinitions
          for (const dataLayerId in figure.data?.dataLayerDefinitions || {}) {
            this.dataLayers[dataLayerId] = {
              figureId: figure.id,
              definition: figure.data.dataLayerDefinitions[dataLayerId],
            };
          }
          // Old format migration: convert inline { rangeXc, sheetId } items
          for (const item of figure.data?.items || []) {
            if (item.type === "dataLayer" && "rangeXc" in item && !item.id && !item.dataLayerId) {
              const dataLayerId = UuidGenerator.smallUuid();
              this.dataLayers[dataLayerId] = {
                figureId: figure.id,
                definition: { rangeXc: item.rangeXc, sheetId: item.sheetId },
              };
              // Mutate item so CarouselPlugin (imports after us) reads new format
              item.id = dataLayerId;
              delete item.rangeXc;
              delete item.sheetId;
            }
          }
        }
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const figure of sheet.figures) {
        if (figure.tag === "dataLayer") {
          // Standalone: find entry where figureId matches
          const entry = this.dataLayers[figure.id];
          if (entry) {
            figure.data = entry.definition;
          }
        } else if (figure.tag === "carousel") {
          // Carousel-owned: find all data layers with this figureId
          const dlDefs: Record<UID, DataLayerDefinition> = {};
          for (const [dlId, entry] of Object.entries(this.dataLayers)) {
            if (entry && entry.figureId === figure.id) {
              dlDefs[dlId] = entry.definition;
            }
          }
          if (Object.keys(dlDefs).length > 0) {
            figure.data = { ...figure.data, dataLayerDefinitions: dlDefs };
          }
        }
      }
    }
  }
}
