import { DEFAULT_ERROR_MESSAGE } from "../../constants";
import { compile } from "../../formulas";
import { cellRegistry } from "../../registries/cell_types";
import { Cell, CellDisplayProperties, CoreGetters, UID } from "../../types";
import { parseDateTime } from "../dates";
import {
  isBoolean,
  isDateTime,
  isMarkdownLink,
  isMarkdownSheetLink,
  isWebLink,
  markdownLink,
} from "../misc";
import { isNumber, parseNumber } from "../numbers";
import {
  BadExpressionCell,
  BooleanCell,
  DateTimeCell,
  EmptyCell,
  FormulaCell,
  NumberCell,
  SheetLinkCell,
  TextCell,
  WebLinkCell,
} from "./cell_types";

cellRegistry
  .add("Formula", {
    sequence: 10,
    match: (content) => content.startsWith("="),
    createCell: (id, content, properties, sheetId, getters) => {
      const compiledFormula = compile(content);
      const dependencies = compiledFormula.dependencies.map((xc) =>
        getters.getRangeFromSheetXC(sheetId, xc)
      );
      const format = properties.format || getters.inferFormulaFormat(compiledFormula, dependencies);
      return new FormulaCell(
        (cell: FormulaCell) => getters.buildFormulaContent(sheetId, cell),
        id,
        content,
        compiledFormula,
        dependencies,
        {
          ...properties,
          format,
        }
      );
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
  })
  .add("MarkdownSheetLink", {
    sequence: 60,
    match: (content) => isMarkdownSheetLink(content),
    createCell: (id, content, properties, sheetId, getters) => {
      return new SheetLinkCell(id, content, properties, (sheetId) =>
        getters.tryGetSheetName(sheetId)
      );
    },
  })
  .add("MarkdownLink", {
    sequence: 70,
    match: (content) => isMarkdownLink(content),
    createCell: (id, content, properties) => {
      return new WebLinkCell(id, content, properties);
    },
  })
  .add("WebLink", {
    sequence: 80,
    match: (content) => isWebLink(content),
    createCell: (id, content, properties) => {
      return new WebLinkCell(id, markdownLink(content, content), properties);
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
    try {
      return builder.createCell(id, content, properties, sheetId, getters);
    } catch (error) {
      return new BadExpressionCell(id, content, error.message || DEFAULT_ERROR_MESSAGE, properties);
    }
  };
}
