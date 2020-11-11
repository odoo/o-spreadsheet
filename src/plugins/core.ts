import { BasePlugin } from "../base_plugin";
import { compile, normalize } from "../formulas/index";
import { formatDateTime, InternalDate, parseDateTime } from "../functions/dates";
import {
  formatNumber,
  formatStandardNumber,
  isNumber,
  parseNumber,
  toXC,
  toZone,
  mapCellsInZone,
  uuidv4,
  toCartesian,
} from "../helpers/index";
import { WHistory } from "../history";
import { ModelConfig } from "../model";
import { _lt } from "../translation";
import {
  Cell,
  CellData,
  Command,
  Zone,
  UID,
  NormalizedFormula,
  Sheet,
  WorkbookData,
  CommandDispatcher,
  Getters,
  CellCreatedEvent,
  StyleUpdatedEvent,
  FormatUpdatedEvent,
  BorderUpdatedEvent,
  ContentUpdatedEvent,
  CellDeletedEvent,
} from "../types/index";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

interface CoreState {
  // this.cells[sheetId][cellId] --> cell|undefined
  cells: Record<UID, Cell | undefined>;
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CorePlugin extends BasePlugin<CoreState> implements CoreState {
  static getters = [
    "getCellText",
    "zoneToXC",
    "shouldShowFormulas",
    "getRangeValues",
    "getRangeFormattedValues",
    "getCellById",
  ];

  private showFormulas: boolean = false;
  public readonly cells: Record<UID, Cell | undefined> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  constructor(
    getters: Getters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(getters, history, dispatch, config);
    this.bus.on("cell-created", this, this.onCellCreated);
    this.bus.on("cell-deleted", this, this.onCellDeleted);
    this.bus.on("content-updated", this, this.onContentUpdated);
    this.bus.on("border-updated", this, this.onBorderUpdated);
    this.bus.on("format-updated", this, this.onFormatUpdated);
    this.bus.on("style-updated", this, this.onStyleUpdated);
  }

  onCellDeleted(event: CellDeletedEvent) {
    const cell = this.cells[event.cellId]!;
    this.history.addEvent({
      type: "cell-created",
      cellId: cell.id,
      style: cell.style,
      format: cell.format,
      border: cell.border,
    });
    if (cell.content) {
      this.history.addEvent({
        type: "content-updated",
        cellId: cell.id,
        content: cell.content,
      });
    }
    delete this.cells[event.cellId];
  }

  onCellCreated(event: CellCreatedEvent) {
    this.cells[event.cellId] = {
      id: event.cellId,
      style: event.style,
      border: event.border,
      format: event.format,
      content: "",
      value: "",
      type: "text",
    };
    this.history.addEvent({
      type: "cell-deleted",
      cellId: event.cellId,
    });
  }

  onContentUpdated(event: ContentUpdatedEvent) {
    if (!(event.cellId in this.cells)) {
      return;
    }
    const oldContent = this.cells[event.cellId]!.content;
    this.history.addEvent({ type: "content-updated", cellId: event.cellId, content: oldContent });
    let content = event.content;
    let type: Cell["type"] = content[0] === "=" ? "formula" : "text";
    let value: Cell["value"] = content;
    let error: Cell["error"];
    let formula: Cell["formula"];
    if (isNumber(content)) {
      value = parseNumber(content);
      type = "number";
      if (content.includes("%")) {
        this.cells[event.cellId]!.format = content.includes(".") ? "0.00%" : "0%";
      }
    }
    let date = parseDateTime(content);
    if (date) {
      type = "date";
      value = date;
      content = formatDateTime(date);
    }
    const contentUpperCase = content.toUpperCase();
    if (contentUpperCase === "TRUE") {
      value = true;
    }
    if (contentUpperCase === "FALSE") {
      value = false;
    }
    if (type === "formula") {
      error = undefined;
      try {
        let formulaString: NormalizedFormula = normalize(content || "");
        let compiledFormula = compile(formulaString);
        formula = {
          compiledFormula: compiledFormula,
          dependencies: formulaString.dependencies,
          text: formulaString.text,
        };
      } catch (e) {
        value = "#BAD_EXPR";
        error = _lt("Invalid Expression");
      }
    }
    this.cells[event.cellId]!.content = content;
    this.cells[event.cellId]!.value = value;
    this.cells[event.cellId]!.formula = formula;
    this.cells[event.cellId]!.error = error;
    this.cells[event.cellId]!.type = type;
  }

  onStyleUpdated(event: StyleUpdatedEvent) {
    const cellId = event.cellId;
    const style = event.style;
    const cell = this.cells[cellId];
    if (!cell) {
      return;
    }
    this.history.addEvent({ type: "style-updated", cellId: cellId, style: cell.style });
    cell.style = style;
  }

  onFormatUpdated(event: FormatUpdatedEvent) {
    if (!(event.cellId in this.cells)) {
      return;
    }
    const oldFormat = this.cells[event.cellId]!.format;
    this.history.addEvent({
      type: "format-updated",
      cellId: event.cellId,
      format: oldFormat,
    });
    this.cells[event.cellId]!.format = event.format;
  }

  onBorderUpdated(event: BorderUpdatedEvent) {
    if (!(event.cellId in this.cells)) {
      return;
    }
    const oldBorder = this.cells[event.cellId]!.border;
    this.history.addEvent({
      type: "border-updated",
      cellId: event.cellId,
      border: oldBorder,
    });
    this.cells[event.cellId]!.border = event.border;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        this.updateCell(this.getters.getSheet(cmd.sheetId)!, cmd.col, cmd.row, cmd);
        break;
      case "CLEAR_CELL":
        const cell = this.getters.getCell(cmd.sheetId, cmd.col, cmd.row);
        if (cell) {
          this.deleteCell(cmd.sheetId, cell.id);
        }
        break;
      case "SET_FORMULA_VISIBILITY":
        this.showFormulas = cmd.show;
        break;
      case "DUPLICATE_SHEET":
        this.duplicateSheet(cmd.sheetIdFrom, cmd.sheetIdTo);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const imported_sheet = this.getters.getSheet(sheet.id)!;
      // cells
      for (let xc in sheet.cells) {
        const cell = sheet.cells[xc];
        const [col, row] = toCartesian(xc);
        this.updateCell(imported_sheet, col, row, cell);
      }
    }
  }

  export(data: WorkbookData) {
    for (let _sheet of data.sheets) {
      const cells: { [key: string]: CellData } = {};
      for (let cell of Object.values(this.getters.getCells(_sheet.id))) {
        let position = this.getters.getCellPosition(cell.id);
        let xc = toXC(position.col, position.row);
        cells[xc] = {
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format,
        };
        if (cell.type === "formula" && cell.formula) {
          cells[xc].formula = {
            text: cell.formula.text || "",
            dependencies: cell.formula.dependencies.slice() || [],
          };
        }
      }
      _sheet.cells = cells;
    }
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------

  getCellById(cellId: UID): Cell | undefined {
    // TODO PRO: we should return Cell, not Cell | undefined and throw an error if the cell is undefined
    return this.cells[cellId];
  }

  getCellText(cell: Cell): string {
    const value = this.showFormulas ? cell.content : cell.value;
    const shouldFormat = (value || value === 0) && cell.format && !cell.error && !cell.pending;
    const dateTimeFormat = shouldFormat && cell.format!.match(/[ymd:]/);
    const numberFormat = shouldFormat && !dateTimeFormat;
    switch (typeof value) {
      case "string":
        return value;
      case "boolean":
        return value ? "TRUE" : "FALSE";
      case "number":
        if (dateTimeFormat) {
          return formatDateTime({ value } as InternalDate, cell.format);
        }
        if (numberFormat) {
          return formatNumber(value, cell.format!);
        }
        return formatStandardNumber(value);
      case "object":
        if (dateTimeFormat) {
          return formatDateTime(value as InternalDate, cell.format);
        }
        if (numberFormat) {
          return formatNumber(value.value, cell.format!);
        }
        if (value && value.format!.match(/[ymd:]/)) {
          return formatDateTime(value);
        }
        return "0";
    }
    return value.toString();
  }

  /**
   * Converts a zone to a XC coordinate system
   *
   * The conversion also treats merges as one single cell
   *
   * Examples:
   * {top:0,left:0,right:0,bottom:0} ==> A1
   * {top:0,left:0,right:1,bottom:1} ==> A1:B2
   *
   * if A1:B2 is a merge:
   * {top:0,left:0,right:1,bottom:1} ==> A1
   * {top:1,left:0,right:1,bottom:2} ==> A1:B3
   *
   * if A1:B2 and A4:B5 are merges:
   * {top:1,left:0,right:1,bottom:3} ==> A1:A5
   */
  zoneToXC(zone: Zone): string {
    zone = this.getters.expandZone(zone);
    const topLeft = toXC(zone.left, zone.top);
    const botRight = toXC(zone.right, zone.bottom);
    if (
      topLeft != botRight &&
      this.getters.getMainCell(topLeft) !== this.getters.getMainCell(botRight)
    ) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  shouldShowFormulas(): boolean {
    return this.showFormulas;
  }

  getRangeValues(reference: string, defaultSheetId: UID): any[][] {
    const [range, sheetName] = reference.split("!").reverse();
    const sheetId = sheetName ? this.getters.getSheetIdByName(sheetName) : defaultSheetId;
    const sheet = sheetId ? this.getters.getSheet(sheetId) : undefined;
    if (sheet === undefined) return [[]];
    return mapCellsInZone(
      toZone(range),
      sheet,
      (cellId) => cellId && this.getCellById(cellId)!.value
    );
  }

  getRangeFormattedValues(reference: string, defaultSheetId: UID): string[][] {
    const [range, sheetName] = reference.split("!").reverse();
    const sheetId = sheetName ? this.getters.getSheetIdByName(sheetName) : defaultSheetId;
    const sheet = sheetId ? this.getters.getSheet(sheetId) : undefined;
    if (sheet === undefined) return [[]];
    return mapCellsInZone(
      toZone(range),
      sheet,
      (cellId) => cellId && this.getCellText(this.getCellById(cellId)!),
      ""
    );
  }

  // ---------------------------------------------------------------------------
  // Cells
  // ---------------------------------------------------------------------------

  /**
   * Duplicate all the cells in the base sheet (sheetIdFrom)
   *
   * @param sheetIdFrom Id of the base sheet
   * @param sheetIdTo Id of the new sheet
   */
  private duplicateSheet(sheetIdFrom: UID, sheetIdTo: UID) {
    const cells = this.getters.getCells(sheetIdFrom);
    for (let cell of Object.values(cells)) {
      const { col, row } = this.getters.getCellPosition(cell.id);
      const id = uuidv4();
      this.history.update("cells", id, { ...cell, id });
      this.dispatch("UPDATE_CELL_POSITION", {
        col,
        row,
        sheetId: sheetIdTo,
        cellId: id,
      });
    }
  }

  private deleteCell(sheetId: UID, cellId: UID) {
    const cell = this.getCellById(cellId);
    if (cell) {
      this.bus.trigger("cell-deleted", { cellId: cellId });
      const position = this.getters.getCellPosition(cellId);
      this.dispatch("UPDATE_CELL_POSITION", {
        cellId: undefined,
        col: position.col,
        row: position.row,
        sheetId,
      });
    }
  }

  private updateCell(sheet: Sheet, col: number, row: number, data: CellData) {
    let current = this.getters.getCell(sheet.id, col, row);
    const hasContent = "content" in data;

    // Compute the new cell properties
    const dataContent = data.content ? data.content.replace(nbspRegexp, "") : "";
    let content = hasContent ? dataContent : (current && current.content) || "";
    const style = "style" in data ? data.style : (current && current.style) || 0;
    const border = "border" in data ? data.border : (current && current.border) || 0;
    let format = "format" in data ? data.format : (current && current.format) || "";

    //if all are empty, we need to delete the underlying cell object
    if (!content && !style && !border && !format) {
      if (current) {
        this.deleteCell(sheet.id, current.id);
      }
      return;
    }

    // compute the new cell value
    const didContentChange = !current || (hasContent && current && current.content !== dataContent);
    if (!current) {
      const id = uuidv4();
      this.bus.trigger("cell-created", {
        cellId: id,
        style: data.style,
        border: data.border,
        format: data.format,
      });
      this.bus.trigger("content-updated", { cellId: id, content });
      current = this.cells[id]!;
    } else {
      if (didContentChange) {
        this.bus.trigger("content-updated", { cellId: current.id, content });
      }
      if (style || ("style" in data && !data.style)) {
        if ("style" in data && !data.style) {
          this.bus.trigger("style-updated", { cellId: current.id, style: undefined });
        } else {
          this.bus.trigger("style-updated", { cellId: current.id, style: style });
        }
      }
      if (border || ("border" in data && !data.border)) {
        if ("border" in data && !data.border) {
          this.bus.trigger("border-updated", { cellId: current.id, border: undefined });
        } else {
          this.bus.trigger("border-updated", { cellId: current.id, border: border });
        }
      }
      if (format || ("format" in data && !data.format)) {
        if ("format" in data && !data.format) {
          this.bus.trigger("format-updated", { cellId: current.id, format: undefined });
        } else {
          this.bus.trigger("format-updated", { cellId: current.id, format: format });
        }
      }
    }
    this.dispatch("UPDATE_CELL_POSITION", {
      cellId: current.id,
      col,
      row,
      sheetId: sheet.id,
    });
  }
}
