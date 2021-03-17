import { compile, normalize } from "../../../formulas";
import { InternalDate, parseDateTime } from "../../../functions/dates";
import { isNumber, parseNumber } from "../../../helpers";
import { _lt } from "../../../translation";
import { CellType, CoreGetters, NormalizedFormula, Range, UID } from "../../../types";
import { CellContent } from "../../../types/spreadsheet_core";
import { getNextId } from "./manager";

export class ContentManager {
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

  getValue(id: UID): any {
    const content = this.get(id);
    switch (content.type) {
      case CellType.boolean:
        return content.text.toUpperCase() === "TRUE";
      case CellType.number:
        return parseNumber(content.text);
      case CellType.text:
        return content.text;
      case CellType.invalidFormula:
        return "#BAD_EXPR";
      case CellType.empty:
        return "";
      case CellType.formula:
        return content.value;
    }
  }

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
