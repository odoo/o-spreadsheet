import { DEFAULT_ERROR_MESSAGE } from "../constants";
import { compile, normalize } from "../formulas";
import { cellTypes } from "../registries/cell_registry";
import { CellDisplayProperties, CoreGetters, UID } from "../types";
import {
  BooleanCell,
  computeFormulaFormat,
  DateTimeCell,
  EmptyCell,
  FormulaCell,
  InvalidFormulaCell,
  NumberCell,
  SheetLinkCell,
  TextCell,
  WebLinkCell,
} from "./cells";
import { parseDateTime } from "./dates";
import {
  isBoolean,
  isDateTime,
  isMarkdownLink,
  isMarkdownSheetLink,
  isWebLink,
  markdownLink,
} from "./misc";
import { isNumber, parseNumber } from "./numbers";

cellTypes
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
  })
  .add("MarkdownSheetLink", {
    sequence: 60,
    match: (content) => isMarkdownSheetLink(content),
    createCell: (id, content, properties, sheetId, getters) => {
      return new SheetLinkCell(
        id,
        content,
        properties,
        (sheetId) => getters.getSheetName(sheetId) || ""
      ); // TODO check this crap: || ""
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
  })
  .add("Text", {
    sequence: 90,
    match: () => true,
    createCell: (id, content, properties) => new TextCell(id, content, properties),
  });

/**
 * Return a factory function which can create cells
 */
export function cellFactory(getters: CoreGetters) {
  const factories = cellTypes.getAll().sort((a, b) => a.sequence - b.sequence);
  return function createCell(
    id: UID,
    content: string,
    properties: CellDisplayProperties,
    sheetId: UID
  ) {
    // TODO order based on sequence
    const factory = factories.find((factory) => factory.match(content));
    return factory!.createCell(id, content, properties, sheetId, getters);
  };
}
