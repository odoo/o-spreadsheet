import { types as owlTypes } from "@odoo/owl";
import { Action, ActionSpec, MenuItemOrSeparator } from "../actions/action";
import { Token } from "../formulas/tokenizer";
import { PivotRuntimeDefinition } from "../helpers/pivot/pivot_runtime_definition";
import { Model } from "../model";
import {
  AutoCompleteProposal,
  AutoCompleteProviderDefinition,
} from "../registries/auto_completes/auto_complete_registry";
import { SidePanelContent } from "../registries/side_panel_registry";
import {
  ChartColorScale,
  ChartDefinition,
  ChartDefinitionWithDataSource,
  ChartRangeDataSource,
  ChartStyle,
  ChartWithAxisDefinition,
  DataSetStyle,
  TitleDesign,
} from "../types/chart/chart";
import { FunnelChartDefinition } from "../types/chart/funnel_chart";
import { GeoChartDefinition } from "../types/chart/geo_chart";
import {
  TreeMapCategoryColorOptions,
  TreeMapChartDefinition,
  TreeMapColorScaleOptions,
} from "../types/chart/tree_map_chart";
import { DispatchResult } from "../types/commands";
import { ColorScaleThreshold, ConditionalFormat } from "../types/conditional_formatting";
import { DataValidationCriterionType, DataValidationRule } from "../types/data_validation";
import { InformationNotification } from "../types/env";
import { FigureUI, ResizeDirection } from "../types/figure";
import { FunctionDescription } from "../types/functions";
import { GenericCriterionType } from "../types/generic_criterion";
import {
  BorderPosition,
  borderPositions,
  BorderStyle,
  borderStyles,
  CellPosition,
  Color,
  ComposerFocusType,
  composerFocusTypes,
  CSSProperties,
  Dimension,
  GridClickModifiers,
  HeaderGroup,
  HeaderIndex,
  NamedRange,
  Pixel,
  Position,
  SortDirection,
  UID,
  Zone,
} from "../types/misc";
import {
  PivotCoreDefinition,
  PivotCoreMeasure,
  PivotCustomGroupedField,
  PivotDimension,
  PivotField,
  PivotFilter,
  PivotMeasure,
  SpreadsheetPivotCoreDefinition,
} from "../types/pivot";
import { Range } from "../types/range";
import { DOMCoordinates, DOMDimension, Rect } from "../types/rendering";
import { Store } from "../types/store_engine";
import { NotificationStoreMethods } from "../types/stores/notification_store_methods";
import {
  CoreTable,
  CriterionFilter,
  DataFilterValue,
  Table,
  TableConfig,
  TableStyle,
} from "../types/table";
import type { ComposerSelection } from "./composer/composer/abstract_composer_store";
import type { ContextMenuType } from "./grid/grid";
import type { ZoomedMouseEvent } from "./helpers/zoom";
import type { SidePanelComponentProps } from "./side_panel/side_panel/side_panel_store";

/*
 * This file defines custom prop validators for our components, using the basic
 * validators provided by Owl (e.g. `owlTypes.string()`) and adding extra checks
 * when necessary. It also re-exports the basic validators from Owl so that they
 * can be used in our components without having to import Owl directly in each of
 * them.
 * We also improve the type inference of the basic validators by creating wrapper
 * functions (e.g. `validateString`) that allow us to specify a more specific
 * type for the prop.
 */

/**
 * Validate that a prop is a number, but with a more specific type than just `number` (e.g. `Pixel`).
 */
function validateNumber<T extends number>(): T {
  return owlTypes.number() as any;
}

/**
 * Validate that a prop is a string, but with a more specific type than just `string` (e.g. `Color`).
 */
function validateString<T extends string>(): T {
  return owlTypes.string() as any;
}

/**
 * Validate that a prop is an object, but with a more specific type than just `object` (e.g. `ActionSpec`).
 */
function validateObject<T>(): T {
  return owlTypes.object() as any;
}

/**
 * Validate that a prop is an array, but with a more specific element type than `any[]`.
 */
function validateArrayOf<T>(): T[] {
  return owlTypes.array() as any;
}

/**
 * Validate that a prop is a record (string-keyed dictionary), but with a more
 * specific value type than `any`.
 */
function validateRecordOf<T>(): Record<string, T> {
  return owlTypes.record() as any;
}

/**
 * Validate that a prop is a `Set`, typed with a specific element type.
 */
function validateSetOf<T>(): Set<T> {
  return owlTypes.instanceOf(Set) as any;
}

function validateRect(): Rect {
  return owlTypes.object({
    x: owlTypes.number(),
    y: owlTypes.number(),
    width: owlTypes.number(),
    height: owlTypes.number(),
  }) as any;
}

function validateBorderPosition(): BorderPosition {
  return owlTypes.customValidator(validateString<BorderPosition>(), (position) =>
    borderPositions.includes(position)
  ) as any;
}

function validateBorderStyle(): BorderStyle {
  return owlTypes.customValidator(validateString<BorderStyle>(), (style) =>
    borderStyles.includes(style)
  ) as any;
}

function validateDOMCoordinates(): DOMCoordinates {
  return owlTypes.object({
    x: owlTypes.number(),
    y: owlTypes.number(),
  }) as any;
}

function validateDOMDimension(): DOMDimension {
  return owlTypes.object({
    width: owlTypes.number(),
    height: owlTypes.number(),
  }) as any;
}

function validateSortDirection(): SortDirection {
  return owlTypes.customValidator(validateString<SortDirection>(), (direction) =>
    ["asc", "desc"].includes(direction)
  ) as any;
}

function validateResizeDirection(): ResizeDirection {
  return owlTypes.customValidator(validateNumber<ResizeDirection>(), (direction) =>
    [-1, 0, 1].includes(direction)
  ) as any;
}

function validateComposerFocusType(): ComposerFocusType {
  return owlTypes.customValidator(validateString<ComposerFocusType>(), (value) =>
    composerFocusTypes.includes(value)
  ) as any;
}

function validateDimension(): Dimension {
  return owlTypes.customValidator(validateString<Dimension>(), (value) =>
    ["COL", "ROW"].includes(value)
  ) as any;
}

function validateContextMenuType(): ContextMenuType {
  return owlTypes.customValidator(validateString<ContextMenuType>(), (value) =>
    ["ROW", "COL", "CELL", "FILTER", "GROUP_HEADERS", "UNGROUP_HEADERS"].includes(value)
  ) as any;
}

/**
 * Validate that a prop is a store. Typed as the CQS-wrapped `Store<T>` to
 * match what `useStore(...)` returns at the call site.
 */
function validateStore<T>(): Store<T> {
  return owlTypes.object() as any;
}

export const types = {
  ...owlTypes,
  ArrayOf: validateArrayOf,
  RecordOf: validateRecordOf,
  SetOf: validateSetOf,
  GenericCriterionType: validateString<GenericCriterionType>,
  UID: validateString<UID>,
  CriterionFilter: validateObject<CriterionFilter>,
  CSSProperties: validateObject<CSSProperties>,
  ResizeDirection: validateResizeDirection,
  FigureUI: validateObject<FigureUI>,
  Token: validateObject<Token>,
  CellPosition: validateObject<CellPosition>,
  AutoCompleteProviderDefinition: validateObject<AutoCompleteProviderDefinition>,
  AutoCompleteProposal: validateObject<AutoCompleteProposal>,
  FunctionDescription: validateObject<FunctionDescription>,
  Rect: validateRect,
  Pixel: validateNumber<Pixel>,
  HeaderIndex: validateNumber<HeaderIndex>,
  BorderPosition: validateBorderPosition,
  BorderStyle: validateBorderStyle,
  Color: validateString<Color>,
  ActionSpec: validateObject<ActionSpec>,
  DOMCoordinates: validateDOMCoordinates,
  DOMDimension: validateDOMDimension,
  ComposerFocusType: validateComposerFocusType,
  SortDirection: validateSortDirection,
  Store: validateStore,
  Position: validateObject<Position>,
  PivotCoreDefinition: validateObject<PivotCoreDefinition>,
  PivotField: validateObject<PivotField>,
  PivotDimension: validateObject<PivotDimension>,
  PivotMeasure: validateObject<PivotMeasure>,
  PivotCoreMeasure: validateObject<PivotCoreMeasure>,
  PivotCustomGroupedField: validateObject<PivotCustomGroupedField>,
  PivotRuntimeDefinition: validateObject<PivotRuntimeDefinition>,
  PivotFilter: validateObject<PivotFilter>,
  DataFilterValue: validateObject<DataFilterValue>,
  SpreadsheetPivotCoreDefinition: validateObject<SpreadsheetPivotCoreDefinition>,
  ComposerSelection: validateObject<ComposerSelection>,
  Action: validateObject<Action>,
  MenuItemOrSeparator: validateObject<MenuItemOrSeparator>,
  Model: validateObject<Model>,
  DispatchResult: validateObject<DispatchResult>,
  Zone: validateObject<Zone>,
  Range: validateObject<Range>,
  HeaderGroup: validateObject<HeaderGroup>,
  GridClickModifiers: validateObject<GridClickModifiers>,
  ZoomedMouseEvent: validateObject<ZoomedMouseEvent<MouseEvent | PointerEvent>>,
  ConditionalFormat: validateObject<ConditionalFormat>,
  ColorScaleThreshold: validateObject<ColorScaleThreshold>,
  Table: validateObject<Table>,
  CoreTable: validateObject<CoreTable>,
  TableConfig: validateObject<TableConfig>,
  TableStyle: validateObject<TableStyle>,
  TitleDesign: validateObject<TitleDesign>,
  ChartDefinition: validateObject<ChartDefinition<string>>,
  ChartDefinitionWithDataSource: validateObject<ChartDefinitionWithDataSource<string>>,
  ChartWithAxisDefinition: validateObject<ChartWithAxisDefinition>,
  ChartStyle: validateObject<ChartStyle>,
  ChartColorScale: validateObject<ChartColorScale>,
  ChartRangeDataSource: validateObject<ChartRangeDataSource<string>>,
  DataSetStyle: validateObject<DataSetStyle>,
  GeoChartDefinition: validateObject<GeoChartDefinition<string>>,
  FunnelChartDefinition: validateObject<FunnelChartDefinition<string>>,
  TreeMapChartDefinition: validateObject<TreeMapChartDefinition>,
  TreeMapCategoryColorOptions: validateObject<TreeMapCategoryColorOptions>,
  TreeMapColorScaleOptions: validateObject<TreeMapColorScaleOptions>,
  NamedRange: validateObject<NamedRange>,
  DataValidationRule: validateObject<DataValidationRule>,
  InformationNotification: validateObject<InformationNotification>,
  NotificationStoreMethods: validateObject<NotificationStoreMethods>,
  SidePanelContent: validateObject<SidePanelContent>,
  SidePanelComponentProps: validateObject<SidePanelComponentProps>,
  DataValidationCriterionType: validateString<DataValidationCriterionType>,
  Dimension: validateDimension,
  ContextMenuType: validateContextMenuType,
};
