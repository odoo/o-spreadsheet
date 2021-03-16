import { compile, normalize } from "../../../formulas";
import { InternalDate, parseDateTime } from "../../../functions/dates";
import { isNumber, parseNumber } from "../../../helpers";
import { _lt } from "../../../translation";
import {
  Cell,
  CellPosition,
  CellType,
  CompiledFormula,
  CoreCommand,
  CoreGetters,
  NormalizedFormula,
  Range,
  Style,
  UID,
  UpdateCellCommand,
} from "../../../types";
import { CorePlugin } from "../../core_plugin";

let nextId = 1;
function getNextId(): UID {
  return (nextId++).toString();
}

interface InternalCell {
  id: UID;
  styleId?: UID;
  contentId?: UID;
  value: any;
}

abstract class Manager<T> {
  protected content: Record<UID, T> = {};

  register(element: T): UID {
    const id = getNextId();
    this.content[id] = element;
    return id;
  }

  get(id: UID): T {
    if (!(id in this.content)) {
      throw new Error(`Element not found: ${id} on ${this.constructor.name}`);
    }
    return this.content[id];
  }
}
class StyleManager extends Manager<Style> {
  register(style: Style): UID {
    const s = JSON.stringify(style);
    for (const id in this.content) {
      if (JSON.stringify(this.content[id]) === s) {
        return id;
      }
    }
    return super.register(style);
  }
}

interface CellFormulaContent {
  type: CellType.formula;
  formula: {
    text: string;
    compiledFormula: CompiledFormula;
    format?: string;
  };
  dependencies: Range[];
  value: any;
}

interface CellTextContent {
  type: CellType.text | CellType.number;
  text: string;
  value: any;
}

interface CellInvalidFormulaContent {
  type: CellType.invalidFormula;
  text: string;
  error: string;
  value: any;
}

interface CellEmptyContent {
  type: CellType.empty;
}

interface CellBooleanContent {
  type: CellType.boolean;
  text: string;
  value: boolean;
}

type CellContent =
  | CellFormulaContent
  | CellBooleanContent
  | CellTextContent
  | CellEmptyContent
  | CellInvalidFormulaContent;

class ContentManager {
  private contents: Record<UID, CellContent> = {};

  constructor(private getters: CoreGetters) {}

  private addEmpty(id: UID) {
    this.contents[id] = { type: CellType.empty };
  }

  private addFormula(id: UID, formula: NormalizedFormula, sheetId: UID) {
    try {
      const compiledFormula = compile(formula);
      let ranges: Range[] = [];

      for (let xc of formula.dependencies) {
        // todo: remove the actual range from the cell and only keep the range Id
        ranges.push(this.getters.getRangeFromSheetXC(sheetId, xc));
      }

      this.contents[id] = {
        type: CellType.formula,
        formula: {
          compiledFormula: compiledFormula,
          text: formula.text,
        },
        dependencies: ranges,
        value: "",
      };

      // TODO:
      // if (!after.formula) {
      //   format = this.computeFormulaFormat(cell);
      // }
    } catch (_) {
      this.contents[id] = {
        type: CellType.invalidFormula,
        text: formula.text, //TODO this is false, we have to reconstruct the formula,
        error: _lt("Invalid Expression"),
        value: "#BAD_EXPR",
      };
    }
  }

  private addNumber(id: UID, text: string) {
    this.contents[id] = {
      type: CellType.number,
      text,
      value: parseNumber(text),
    };
  }

  private addDate(id: UID, date: InternalDate) {
    this.contents[id] = {
      type: CellType.number,
      text: date.value.toString(),
      value: date.value,
    };
  }

  private addBoolean(id: UID, text: string) {
    this.contents[id] = {
      type: CellType.boolean,
      text,
      value: text.toUpperCase() === "TRUE",
    };
  }

  private addText(id: UID, text: string) {
    this.contents[id] = {
      type: CellType.text,
      text,
      value: text,
    };
  }

  // getCellValue(id: UID): any {
  //   const content = this.get(id);
  //   switch (content.type) {
  //     case CellType.boolean:
  //       return content.text.toUpperCase() === "TRUE";
  //     case CellType.number:
  //       return parseNumber(content.text);
  //     case CellType.text:
  //       return content.text;
  //     case CellType.invalidFormula:
  //       return "#BAD_EXPR";
  //     case CellType.empty:
  //       return "";
  //     case CellType.formula:
  //       return content.value;
  //   }
  // }

  register(content: { text: string; formula?: NormalizedFormula }, sheetId: UID): UID {
    const id = getNextId();
    let formulaString = content.formula;
    if (!formulaString && content.text[0] === "=") {
      formulaString = normalize(content.text);
    }
    if (formulaString) {
      this.addFormula(id, formulaString, sheetId);
      return id;
    }
    if (content.text === "") {
      this.addEmpty(id);
      return id;
    }
    if (isNumber(content.text)) {
      this.addNumber(id, content.text);
      return id;
      //     if (afterContent.includes("%")) {
      //       format = afterContent.includes(".") ? "0.00%" : "0%";
      //     }
    }
    const internalDate = parseDateTime(content.text);
    if (internalDate !== null) {
      this.addDate(id, internalDate);
      //       if (!format) {
      //         format = internaldate.format;
      //       }
      return id;
    }
    if (["TRUE", "FALSE"].includes(content.text.toUpperCase())) {
      this.addBoolean(id, content.text);
      return id;
    }
    this.addText(id, content.text);
    return id;
  }

  get(id: UID): CellContent {
    if (!(id in this.contents)) {
      throw new Error(`Element not found: ${id} on ${this.constructor.name}`);
    }
    return this.contents[id];
  }

  getType(id: UID): CellType {
    return this.get(id).type;
  }
}

interface SpreadsheetCoreState {
  readonly cells: Record<UID, InternalCell | undefined>;
  readonly styleManager: StyleManager;
  readonly contentManager: ContentManager;
  readonly position: Record<string, UID | undefined>;
}

export class SpreadsheetPlugin
  extends CorePlugin<SpreadsheetCoreState>
  implements SpreadsheetCoreState {
  readonly cells: Record<UID, InternalCell | undefined> = {};
  readonly styleManager: StyleManager = new StyleManager();
  readonly contentManager: ContentManager = new ContentManager(this.getters);
  readonly position: Record<string, UID | undefined> = {};

  // adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
  //   for (const cell of Object.values(this.cells).filter(isDefined)) {
  //     if (cell.type === CellType.formula) {
  //       for (const range of cell.dependencies) {
  //         if (!sheetId || range.sheetId === sheetId) {
  //           const change = applyChange(range);
  //           if (change.changeType !== "NONE") {
  //             this.history.update(
  //               "cells",
  //               sheet,
  //               cell.id,
  //               "dependencies" as any,
  //               cell.dependencies.indexOf(range),
  //               change.range
  //             );
  //           }
  //         }
  //       }
  //     }
  //   }
  // }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        this.updateCell(cmd);
        break;
    }
  }

  private getKey(position: CellPosition) {
    return JSON.stringify(position);
  }

  private createCell(position: CellPosition): InternalCell {
    const cell = {
      id: getNextId(),
      value: "",
    };
    this.history.update("cells", cell.id, cell);
    this.setCellPosition(cell.id, position);
    return cell;
  }

  private setCellPosition(cellId: UID, position: CellPosition) {
    this.history.update("position", JSON.stringify(position), cellId);
  }

  deleteCell(position: CellPosition) {
    const key = JSON.stringify(position);
    const cellId = this.position[key];
    if (cellId) {
      this.history.update("cells", cellId, undefined);
      this.history.update("position", key, undefined);
    }
  }

  private updateCell(cmd: UpdateCellCommand) {
    const position = { sheetId: cmd.sheetId, col: cmd.col, row: cmd.row };
    const key = JSON.stringify(position);
    const existingCellId = this.position[key];
    if (existingCellId) {
      if (cmd.content === "" && cmd.format === "" && cmd.style === null) {
        this.deleteCell(position);
        return;
      }
    } else {
      //Create a new one
      const cell = this.createCell(position);
      if (cmd.style !== undefined && cmd.style !== null) {
        cell.styleId = this.styleManager.register(cmd.style);
      }
      if (cmd.content !== undefined) {
        cell.contentId = this.contentManager.register({ text: cmd.content }, cmd.sheetId);
      }
    }
  }

  getCell(position: CellPosition): Cell | undefined {
    const cellId = this.position[this.getKey(position)];
    if (!cellId) {
      return undefined;
    }
    const cell = this.cells[cellId];
    if (!cell) {
      throw new Error(`bug`);
    }
    const style = (cell.styleId !== undefined && this.styleManager.get(cell.styleId)) || undefined;
    const content = (cell.contentId !== undefined && this.contentManager.get(cell.contentId).) || "";
    return {
      ...cell,
      type: CellType.text,
      content: content,
      style,
    };
  }
}
