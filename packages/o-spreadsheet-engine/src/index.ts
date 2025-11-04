import { transformRangeData } from "./collaborative/ot/ot_helpers";
import { ChartTerms } from "./components/translations_terms";
import {
  FIGURE_ID_SPLITTER,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  HIGHLIGHT_COLOR,
  PIVOT_TABLE_CONFIG,
} from "./constants";
import { getFunctionsFromTokens } from "./formulas/helpers";
import { arg } from "./functions/arguments";
import { functionRegistry } from "./functions/function_registry";
import { isEvaluationError, toBoolean, toJsDate, toNumber, toString } from "./functions/helpers";
import {
  UuidGenerator,
  deepCopy,
  deepEquals,
  getUniqueText,
  isDefined,
  isNumber,
  lazy,
  sanitizeSheetName,
  splitReference,
  unquote,
} from "./helpers";
import { ColorGenerator, colorToRGBA, rgbaToHex } from "./helpers/color";
import { lettersToNumber, numberToLetters, toCartesian, toXC } from "./helpers/coordinates";
import { isDateTime } from "./helpers/dates";
import { createCurrencyFormat, formatValue } from "./helpers/format/format";
import { urlRegistry } from "./helpers/links";
import {
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
} from "./helpers/pivot/pivot_composer_helpers";
import {
  areDomainArgsFieldsValid,
  createCustomFields,
  createPivotFormula,
  getMaxObjectId,
  isDateOrDatetimeField,
  parseDimension,
  pivotNormalizationValueRegistry,
  pivotToFunctionValueRegistry,
  toFunctionPivotValue,
  toNormalizedPivotValue,
} from "./helpers/pivot/pivot_helpers";
import { pivotRegistry } from "./helpers/pivot/pivot_registry";
import { pivotTimeAdapter, pivotTimeAdapterRegistry } from "./helpers/pivot/pivot_time_adapter";
import { computeTextWidth } from "./helpers/text_helper";
import {
  expandZoneOnInsertion,
  isInside,
  mergeContiguousZones,
  overlap,
  positionToZone,
  reduceZoneOnDeletion,
  toUnboundedZone,
  toZone,
  union,
} from "./helpers/zones";
import {
  createEmptyExcelSheet,
  createEmptySheet,
  createEmptyWorkbookData,
} from "./migrations/data";
import { migrationStepRegistry } from "./migrations/migration_steps";
import {
  corePluginRegistry,
  coreViewsPluginRegistry,
  featurePluginRegistry,
  statefulUIPluginRegistry,
} from "./plugins";
import { UNDO_REDO_PIVOT_COMMANDS } from "./plugins/ui_core_views/pivot_ui";
import { autofillModifiersRegistry } from "./registries/autofill_modifiers";
import { autofillRulesRegistry } from "./registries/autofill_rules";
import { chartRegistry } from "./registries/chart_registry";
import { chartSubtypeRegistry } from "./registries/chart_subtype_registry";
import { clipboardHandlersRegistries } from "./registries/clipboardHandlersRegistries";
import { iconsOnCellRegistry } from "./registries/icons_on_cell_registry";
import { inverseCommandRegistry } from "./registries/inverse_command_registry";
import { otRegistry } from "./registries/ot_registry";
import {
  repeatCommandTransformRegistry,
  repeatLocalCommandTransformRegistry,
} from "./registries/repeat_transform_registry";
import { errorTypes } from "./types/errors";
import { DEFAULT_LOCALE } from "./types/locale";
import { isMatrix } from "./types/misc";
export { EventBus } from "./helpers/event_bus";
export { coreTypes, invalidateEvaluationCommands } from "./types/commands";
export { EvaluationError } from "./types/errors";

export { FunctionCodeBuilder, Scope, type FunctionCode } from "./formulas/code_builder";
export {
  OPERATOR_MAP,
  UNARY_OPERATOR_MAP,
  compile,
  compileTokens,
  functionCache,
} from "./formulas/compiler";
export {
  OP_PRIORITY,
  convertAstNodes,
  iterateAstNodes,
  mapAst,
  parse,
  parseTokens,
} from "./formulas/parser";
export type {
  AST,
  ASTFuncall,
  ASTOperation,
  ASTString,
  ASTSymbol,
  ASTUnaryOperation,
} from "./formulas/parser";
export { rangeTokenize } from "./formulas/range_tokenizer";
export { POSTFIX_UNARY_OPERATORS, tokenize } from "./formulas/tokenizer";
export type { Token } from "./formulas/tokenizer";
export { FunctionRegistry, categories } from "./functions/function_registry";
export * from "./helpers";
export { Model } from "./model";
export { BasePlugin } from "./plugins/base_plugin";
export { CorePlugin } from "./plugins/core_plugin";
export { CoreViewPlugin } from "./plugins/core_view_plugin";
export { UIPlugin } from "./plugins/ui_plugin";
export { Registry } from "./registry";
export { StateObserver } from "./state_observer";
export * from "./translation";
export { CellValue } from "./types/cells";
export { SpreadsheetClipboardData } from "./types/clipboard";
export { CoreGetters, PluginGetters } from "./types/core_getters";
export * from "./types/errors";
export { Format } from "./types/format";
export * from "./types/history";
export * from "./types/locale";
export * from "./types/misc";
export * from "./types/rendering";
export * from "./types/validator";

export const registries = {
  autofillModifiersRegistry,
  autofillRulesRegistry,
  errorTypes,
  functionRegistry,
  featurePluginRegistry,
  iconsOnCellRegistry,
  statefulUIPluginRegistry,
  coreViewsPluginRegistry,
  corePluginRegistry,

  chartRegistry,
  chartSubtypeRegistry,

  otRegistry,
  inverseCommandRegistry,
  urlRegistry,

  repeatLocalCommandTransformRegistry,
  repeatCommandTransformRegistry,
  clipboardHandlersRegistries,
  pivotRegistry,
  pivotTimeAdapterRegistry,

  pivotNormalizationValueRegistry,

  pivotToFunctionValueRegistry,
  migrationStepRegistry,
};

export const constants = {
  DEFAULT_LOCALE,
  HIGHLIGHT_COLOR,
  PIVOT_TABLE_CONFIG,
  ChartTerms,
  FIGURE_ID_SPLITTER,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
};

console.log("coucou2");
export const helpers = {
  arg,
  isEvaluationError,
  toBoolean,
  toJsDate,
  toNumber,
  toString,
  toNormalizedPivotValue,
  toFunctionPivotValue,
  toXC,
  toZone,
  toUnboundedZone,
  toCartesian,
  numberToLetters,
  lettersToNumber,
  UuidGenerator,
  formatValue,
  createCurrencyFormat,
  ColorGenerator,
  computeTextWidth,
  createEmptyWorkbookData,
  createEmptySheet,
  createEmptyExcelSheet,
  rgbaToHex,
  colorToRGBA,
  positionToZone,
  isDefined,
  isMatrix,
  lazy,
  transformRangeData,
  deepEquals,
  overlap,
  union,
  isInside,
  deepCopy,
  expandZoneOnInsertion,
  reduceZoneOnDeletion,
  unquote,
  getMaxObjectId,
  getFunctionsFromTokens,
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
  parseDimension,
  isDateOrDatetimeField,
  mergeContiguousZones,
  pivotTimeAdapter,
  UNDO_REDO_PIVOT_COMMANDS,
  createPivotFormula,
  areDomainArgsFieldsValid,
  splitReference,
  sanitizeSheetName,
  getUniqueText,
  isNumber,
  isDateTime,
  createCustomFields,
};
export const __info__ = {};
