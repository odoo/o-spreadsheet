import { ChartConfiguration } from "chart.js";
import { EnrichedToken } from "../formulas/range_tokenizer";
import { Tooltip } from "./autofill";
import { ChartDefinition, ChartUIDefinition } from "./chart";
import { Client, ClientToDisplay } from "./collaborative/session";
import { ConditionalFormat } from "./conditional_formatting";
import { Figure } from "./figure";
import {
  AutomaticSum,
  Border,
  Cell,
  CellPosition,
  Col,
  ComposerSelection,
  ConsecutiveIndexes,
  Dimension,
  EditionMode,
  FormulaCell,
  Highlight,
  Merge,
  Range,
  RangeInputValue,
  Row,
  SearchMatch,
  Selection,
  SelectionMode,
  Sheet,
  Style,
  UID,
  Zone,
  ZoneDimension,
} from "./misc";
import { EdgeScrollInfo, Rect, Viewport } from "./rendering";

// -----------------------------------------------------------------------------
// Core
// -----------------------------------------------------------------------------

export interface LocalHistoryGetters {
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export interface SheetPluginGetters {
  getEvaluationSheets: () => Record<UID, Sheet | undefined>;
  getSheet: (sheetId: UID) => Sheet;
  tryGetSheet: (sheetId: UID) => Sheet | undefined;
  getSheetName: (sheetId: UID) => string;
  getSheetIdByName: (name: string | undefined) => UID | undefined;
  getSheets: () => Sheet[];
  getVisibleSheets: () => UID[];
  getCol: (sheetId: UID, index: number) => Col | undefined;
  getRow: (sheetId: UID, index: number) => Row | undefined;
  getCell: (sheetId: UID, col: number, row: number) => Cell | undefined;
  getCellPosition: (cellId: UID) => CellPosition;
  getColCells: (sheetId: UID, col: number) => Cell[];
  getColsZone: (sheetId: UID, start: number, end: number) => Zone;
  getRowsZone: (sheetId: UID, start: number, end: number) => Zone;
  getHiddenColsGroups: (sheetId: UID) => ConsecutiveIndexes[];
  getHiddenRowsGroups: (sheetId: UID) => ConsecutiveIndexes[];
  getGridLinesVisibility: (sheetId: UID) => boolean;
  getNumberRows: (sheetId: UID) => number;
  getNumberCols: (sheetId: UID) => number;
  isEmpty: (sheetId: UID, zone: Zone) => boolean;
}

export interface CellPluginGetters {
  zoneToXC: (sheetId: UID, zone: Zone) => string;
  getCells: (sheetId: UID) => Record<UID, Cell>;
  getFormulaCellContent: (sheetId: UID, cell: FormulaCell) => string;
  buildFormulaContent: (sheetId: UID, formula: string, dependencies: Range[]) => string;
  getCellText: (cell: Cell, sheetId: UID, showFormula?: boolean) => string;
  getCellValue: (cell: Cell, sheetId: UID, showFormula?: boolean) => any;
  getCellStyle: (cell: Cell) => Style;
  getCellById: (cellId: UID) => Cell | undefined;
}

export interface MergePluginGetters {
  expandZone: (sheetId: UID, zone: Zone) => Zone;
  isInMerge: (sheetId: UID, col: number, row: number) => boolean;
  getMainCell: (sheetId: UID, col: number, row: number) => [number, number];
  doesIntersectMerge: (sheetId: UID, zone: Zone) => boolean;
  isInSameMerge: (sheetId: UID, colA: number, rowA: number, colB: number, rowB: number) => boolean;
  getMerges: (sheetId: UID) => Merge[];
  getMerge: (sheetId: UID, col: number, row: number) => Merge | undefined;
  isMergeHidden: (sheetId: UID, merge: Merge) => boolean;
  isSingleCellOrMerge: (sheetId: UID, zone: Zone) => boolean;
}
export interface ConditionalFormatPluginGetters {
  getConditionalFormats: (sheetId: UID) => ConditionalFormat[];
  getRulesSelection: (sheetId: UID, selection: Zone[]) => UID[];
  getRulesByCell: (sheetId: UID, cellCol: number, cellRow: number) => Set<ConditionalFormat>;
}
export interface FigurePluginGetters {
  getFigures: (sheetId: UID) => Figure[];
  getFigure: (sheetId: string, figureId: string) => Figure | undefined;
}
export interface BordersPluginGetters {
  getCellBorder: (sheetId: UID, col: number, row: number) => Border | null;
}
export interface ChartPluginGetters {
  getChartDefinition: (figureId: UID) => ChartDefinition | undefined;
  getChartsIdBySheet: (sheetId: UID) => UID[];
  getChartDefinitionUI: (sheetId: UID, figureId: UID) => ChartUIDefinition;
}
export interface RangeAdapterGetters {
  getRangeString: (range: Range, forSheetId: UID) => string;
  getRangeFromSheetXC: (defaultSheetId: UID, sheetXC: string) => Range;
  createAdaptedRanges: (ranges: Range[], offsetX: number, offsetY: number, sheetId: UID) => Range[];
}

export type CoreGetters = LocalHistoryGetters &
  SheetPluginGetters &
  CellPluginGetters &
  MergePluginGetters &
  ConditionalFormatPluginGetters &
  FigurePluginGetters &
  BordersPluginGetters &
  ChartPluginGetters &
  RangeAdapterGetters & {
    isReadonly: () => boolean;
  };

// -----------------------------------------------------------------------------
// UI
// -----------------------------------------------------------------------------
export interface ClipboardPluginGetters {
  getClipboardContent: () => string;
  isPaintingFormat: () => boolean;
}

export interface SelectionPluginGetters {
  getActiveSheetId: () => UID;
  getActiveSheet: () => Sheet;
  getActiveCell: () => Cell | undefined;
  getActiveCols: () => Set<number>;
  getActiveRows: () => Set<number>;
  getCurrentStyle: () => Style;
  getSelectedZones: () => Zone[];
  getSelectedZone: () => Zone;
  getSelection: () => Selection;
  getSelectedFigureId: () => string | null;
  getVisibleFigures: (sheetId: UID) => Figure[];
  getPosition: () => [number, number];
  getSheetPosition: (sheetId: UID) => [number, number];
  getAggregate: () => string | null;
  getSelectionMode: () => SelectionMode;
  isSelected: (zone: Zone) => boolean;
  getElementsFromSelection: (dimension: Dimension) => number[];
}

export interface SessionGetters {
  getClient: () => Client;
  getConnectedClients: () => Set<Client>;
  isFullySynchronized: () => boolean;
}

export interface SheetUIPluginGetters {
  getCellWidth: (cell: Cell) => number;
  getTextWidth: (cell: Cell) => number;
  getCellHeight: (cell: Cell) => number;
}

export interface EvaluationPluginGetters {
  getRangeFormattedValues: (range: Range) => string[][];
  evaluateFormula: (formula: string, sheetId?: UID) => any;
  isIdle: () => boolean;
  getRangeValues: (range: Range) => any[][];
}

export interface UIOptionsPluginGetters {
  shouldShowFormulas: () => boolean;
}

export interface EvaluationChartPluginGetters {
  getChartRuntime: (figureId: string) => ChartConfiguration | undefined;
}

export interface EvaluationConditionalFormatPluginGetters {
  getConditionalStyle: (col: number, row: number) => Style | undefined;
  getConditionalIcon: (col: number, row: number) => string | undefined;
}

export interface HighlightPluginGetters {
  getHighlights: () => Highlight[];
}

export interface RendererPluginGetters {
  getColIndex: (x: number, left: number, sheet?: Sheet) => number;
  getRowIndex: (y: number, top: number, sheet?: Sheet) => number;
  getRect: (zone: Zone, viewport: Viewport) => Rect;
  getEdgeScrollCol: (x: number) => EdgeScrollInfo;
  getEdgeScrollRow: (y: number) => EdgeScrollInfo;
}

export interface EditionPluginGetters {
  getEditionMode: () => EditionMode;
  isSelectingForComposer: () => boolean;
  getCurrentContent: () => string;
  getEditionSheet: () => string;
  getComposerSelection: () => ComposerSelection;
  getCurrentTokens: () => EnrichedToken[];
  getTokenAtCursor: () => EnrichedToken | undefined;
}

export interface AutofillPluginGetters {
  getAutofillTooltip: () => Tooltip | undefined;
}

export interface SelectionInputPluginGetters {
  getSelectionInput: (id: UID) => (RangeInputValue & { isFocused: boolean })[];
  getSelectionInputValue: (id: UID) => string[];
  isRangeValid: (xc: string) => boolean;
}

export interface FindAndReplacePluginGetters {
  getSearchMatches: () => SearchMatch[];
  getCurrentSelectedMatchIndex: () => number | null;
}

export interface SortPluginGetters {
  getContiguousZone: (sheetId: UID, zone: Zone) => Zone;
}

export interface SelectionMultiUserPluginGetters {
  getClientsToDisplay: () => ClientToDisplay[];
}

export interface ViewportPluginGetters {
  getSnappedViewport: (sheetId: UID) => Viewport;
  getViewportDimension: () => ZoneDimension;
  getActiveViewport: () => Viewport;
  getActiveSnappedViewport: () => Viewport;
  getGridDimension: (sheet: Sheet) => ZoneDimension;
}

export interface AutomaticSumPluginGetters {
  getAutomaticSums: (sheetId: UID, zone: Zone, anchor: [number, number]) => AutomaticSum[];
}

export type Getters = CoreGetters &
  ClipboardPluginGetters &
  SelectionPluginGetters &
  SessionGetters &
  SheetUIPluginGetters &
  EvaluationPluginGetters &
  UIOptionsPluginGetters &
  EvaluationChartPluginGetters &
  EvaluationConditionalFormatPluginGetters &
  HighlightPluginGetters &
  RendererPluginGetters &
  EditionPluginGetters &
  AutofillPluginGetters &
  SelectionInputPluginGetters &
  FindAndReplacePluginGetters &
  SortPluginGetters &
  SelectionMultiUserPluginGetters &
  ViewportPluginGetters &
  AutomaticSumPluginGetters;
