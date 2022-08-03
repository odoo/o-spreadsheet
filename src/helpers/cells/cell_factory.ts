import { isDateTimeFormat } from "..";
import { DEFAULT_ERROR_MESSAGE } from "../../constants";
import { compile } from "../../formulas";
import { cellRegistry } from "../../registries/cell_types";
import { Cell, CellDisplayProperties, CoreGetters, UID } from "../../types";
import { BadExpressionError } from "../../types/errors";
import { parseDateTime } from "../dates";
import { isBoolean, isDateTime, isMarkdownLink, isWebLink, parseMarkdownLink } from "../misc";
import { isNumber, parseNumber } from "../numbers";
import {
  BadExpressionCell,
  BooleanCell,
  DateTimeCell,
  EmptyCell,
  FormulaCell,
  NumberCell,
  TextCell,
} from "./cell_types";

cellRegistry
  .add("Formula", {
    sequence: 10,
    match: (content) => content.startsWith("="),
    createCell: (id, content, properties, url, sheetId, getters) => {
      const compiledFormula = compile(content);
      const dependencies = compiledFormula.dependencies.map((xc) =>
        getters.getRangeFromSheetXC(sheetId, xc)
      );
      return new FormulaCell(
        (cell: FormulaCell) => getters.buildFormulaContent(sheetId, cell),
        id,
        content,
        compiledFormula,
        dependencies,
        properties
      );
    },
  })
  .add("Empty", {
    sequence: 20,
    match: (content) => content === "",
    createCell: (id, content, properties, url) => new EmptyCell(id, properties, url),
  })
  .add("NumberWithDateTimeFormat", {
    sequence: 25,
    match: (content, format) => !!format && isNumber(content) && isDateTimeFormat(format),
    createCell: (id, content, properties, url) => {
      const format = properties.format!;
      return new DateTimeCell(id, parseNumber(content), { ...properties, format }, url);
    },
  })
  .add("Number", {
    sequence: 30,
    match: (content) => isNumber(content),
    createCell: (id, content, properties, url) => {
      if (!properties.format) {
        properties.format = detectNumberFormat(content);
      }
      return new NumberCell(id, parseNumber(content), properties, url);
    },
  })
  .add("Boolean", {
    sequence: 40,
    match: (content) => isBoolean(content),
    createCell: (id, content, properties, url) => {
      return new BooleanCell(id, content.toUpperCase() === "TRUE" ? true : false, properties, url);
    },
  })
  .add("DateTime", {
    sequence: 50,
    match: (content) => isDateTime(content),
    createCell: (id, content, properties, url) => {
      const internalDate = parseDateTime(content)!;
      const format = properties.format || internalDate.format;
      return new DateTimeCell(id, internalDate.value, { ...properties, format }, url);
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
    let url: string | undefined = undefined;

    if (isMarkdownLink(content)) {
      const parsedMarkdown = parseMarkdownLink(content);
      content = parsedMarkdown.label;
      url = parsedMarkdown.url;
    } else if (isWebLink(content)) {
      url = content;
    }

    const builder = builders.find((factory) => factory.match(content, properties.format));
    if (!builder) {
      return new TextCell(id, content, properties, url);
    }
    try {
      return builder.createCell(id, content, properties, url, sheetId, getters);
    } catch (error) {
      return new BadExpressionCell(
        id,
        content,
        new BadExpressionError(error.message || DEFAULT_ERROR_MESSAGE),
        properties
      );
    }
  };
}

function detectNumberFormat(content: string): string | undefined {
  const digitBase = content.includes(".") ? "0.00" : "0";
  const matchedCurrencies = content.match(/[\$€]/);
  if (matchedCurrencies) {
    const matchedFirstDigit = content.match(/[\d]/);
    const currency = "[$" + matchedCurrencies.values().next().value + "]";
    if (matchedFirstDigit!.index! < matchedCurrencies.index!) {
      return "#,##" + digitBase + currency;
    }
    return currency + "#,##" + digitBase;
  }
  if (content.includes("%")) {
    return digitBase + "%";
  }
  return undefined;
}
