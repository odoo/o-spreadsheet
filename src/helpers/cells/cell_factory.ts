import { DEFAULT_ERROR_MESSAGE } from "../../constants";
import { compile, normalize } from "../../formulas";
import { cellRegistry } from "../../registries/cell_types";
import { Cell, CellDisplayProperties, CoreGetters, UID } from "../../types";
import { parseDateTime } from "../dates";
import { isBoolean, isDateTime } from "../misc";
import { isNumber, parseNumber } from "../numbers";
import { computeFormulaFormat } from "./cell_helpers";
import {
  BooleanCell,
  DateTimeCell,
  EmptyCell,
  FormulaCell,
  InvalidFormulaCell,
  NumberCell,
  TextCell,
} from "./cell_types";

cellRegistry
  .add("Formula", {
    sequence: 10,
    match: (content) => content.startsWith("="),
    createCell: (id, content, properties, sheetId, getters) => {
      const formula = normalize(content);
      try {
        const normalizedText = formula.text;
        const compiledFormula = compile(formula);
        const ranges = formula.dependencies.map((xc) => getters.getRangeFromSheetXC(sheetId, xc));
        const format =
          properties.format ||
          computeFormulaFormat(getters.getEvaluationSheets(), compiledFormula, ranges);
        return new FormulaCell(
          (normalizedText, dependencies) =>
            getters.buildFormulaContent(sheetId, normalizedText, dependencies),
          id,
          normalizedText,
          compiledFormula,
          ranges,
          {
            ...properties,
            format,
          }
        );
      } catch (error) {
        return new InvalidFormulaCell(
          id,
          content,
          error.message || DEFAULT_ERROR_MESSAGE,
          properties
        );
      }
    },
  })
  .add("Empty", {
    sequence: 20,
    match: (content) => content === "",
    createCell: (id, content, properties) => new EmptyCell(id, properties),
  })
  .add("Number", {
    sequence: 30,
    match: (content) => isNumber(content),
    createCell: (id, content, properties) => {
      if (!properties.format && content.includes("%")) {
        properties.format = content.includes(".") ? "0.00%" : "0%";
      }
      return new NumberCell(id, parseNumber(content), properties);
    },
  })
  .add("Boolean", {
    sequence: 40,
    match: (content) => isBoolean(content),
    createCell: (id, content, properties) => {
      return new BooleanCell(id, content.toUpperCase() === "TRUE" ? true : false, properties);
    },
  })
  .add("DateTime", {
    sequence: 50,
    match: (content) => isDateTime(content),
    createCell: (id, content, properties) => {
      const internalDate = parseDateTime(content)!;
      const format = properties.format || internalDate.format;
      return new DateTimeCell(id, internalDate.value, { ...properties, format });
    },
  });

/**
 * Return a factory function which can instantiate cells of
 * different types, based on a raw content.
 *
 * ```
 * // the createCell function can be used to instantiate new cells
 * const createCell = cellFactory(getters);
 * const cell = createCell(id, cellContent, cellProperties, sheetId)
 * ```
 */
export function cellFactory(getters: CoreGetters) {
  const builders = cellRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
  return function createCell(
    id: UID,
    content: string,
    properties: CellDisplayProperties,
    sheetId: UID
  ): Cell {
    const builder = builders.find((factory) => factory.match(content));
    if (!builder) {
      return new TextCell(id, content, properties);
    }
    return builder.createCell(id, content, properties, sheetId, getters);
  };
}
