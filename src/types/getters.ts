import { MergePlugin } from "../plugins/base/merge";
import { ClipboardPlugin } from "../plugins/ui/clipboard";
import { SelectionPlugin } from "../plugins/ui/selection";
import { CorePlugin } from "../plugins/base/core";
import { ConditionalFormatPlugin } from "../plugins/base/conditional_format";
import { RendererPlugin } from "../plugins/ui/renderer";
import { FormattingPlugin } from "../plugins/base/formatting";
import { WHistory } from "../history";
import { EvaluationPlugin } from "../plugins/base/evaluation";
import { EditionPlugin } from "../plugins/ui/edition";
import { AutofillPlugin } from "../plugins/ui/autofill";
import { HighlightPlugin } from "../plugins/ui/highlight";
import { SelectionInputPlugin } from "../plugins/ui/selection_inputs";
import { FigurePlugin } from "../plugins/base/figures";
import { ChartPlugin } from "../plugins/base/chart";

// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------

// export interface ClipboardPluginGetters {
//   getClipboardContent: ClipboardPlugin["getClipboardContent"];
//   isPaintingFormat: ClipboardPlugin["isPaintingFormat"];
//   getPasteZones: ClipboardPlugin["getPasteZones"];
// }

// export interface SelectionPluginGetters extends ClipboardPluginGetters {
//   getActiveCell: SelectionPlugin["getActiveCell"];
//   getActiveCols: SelectionPlugin["getActiveCols"];
//   getActiveRows: SelectionPlugin["getActiveRows"];
//   getSelectedZones: SelectionPlugin["getSelectedZones"];
//   getSelectedZone: SelectionPlugin["getSelectedZone"];
//   getSelection: SelectionPlugin["getSelection"];
//   getPosition: SelectionPlugin["getPosition"];
//   getAggregate: SelectionPlugin["getAggregate"];
//   getSelectionMode: SelectionPlugin["getSelectionMode"];
//   isSelected: SelectionPlugin["isSelected"];
// }

export interface UIGetters {
  getClipboardContent: ClipboardPlugin["getClipboardContent"];
  isPaintingFormat: ClipboardPlugin["isPaintingFormat"];
  getPasteZones: ClipboardPlugin["getPasteZones"];

  getActiveCell: SelectionPlugin["getActiveCell"];
  getActiveCols: SelectionPlugin["getActiveCols"];
  getActiveRows: SelectionPlugin["getActiveRows"];
  getSelectedZones: SelectionPlugin["getSelectedZones"];
  getSelectedZone: SelectionPlugin["getSelectedZone"];
  getSelection: SelectionPlugin["getSelection"];
  getPosition: SelectionPlugin["getPosition"];
  getAggregate: SelectionPlugin["getAggregate"];
  getSelectionMode: SelectionPlugin["getSelectionMode"];
  isSelected: SelectionPlugin["isSelected"];

  getHighlights: HighlightPlugin["getHighlights"];

  getColIndex: RendererPlugin["getColIndex"];
  getRowIndex: RendererPlugin["getRowIndex"];
  getRect: RendererPlugin["getRect"];
  snapViewportToCell: RendererPlugin["snapViewportToCell"];
  adjustViewportPosition: RendererPlugin["adjustViewportPosition"];
  adjustViewportZone: RendererPlugin["adjustViewportZone"];

  getEditionMode: EditionPlugin["getEditionMode"];
  isSelectingForComposer: EditionPlugin["isSelectingForComposer"];
  getCurrentContent: EditionPlugin["getCurrentContent"];
  getEditionSheet: EditionPlugin["getEditionSheet"];
  getComposerSelection: EditionPlugin["getComposerSelection"];
  getTokenAtCursor: EditionPlugin["getTokenAtCursor"];

  getAutofillTooltip: AutofillPlugin["getAutofillTooltip"];

  getSelectionInput: SelectionInputPlugin["getSelectionInput"];
  getSelectionInputValue: SelectionInputPlugin["getSelectionInputValue"];
}

export interface BaseGetters {
  applyOffset: CorePlugin["applyOffset"];
  getCell: CorePlugin["getCell"];
  getCellText: CorePlugin["getCellText"];
  zoneToXC: CorePlugin["zoneToXC"];

  getActiveSheetId: CorePlugin["getActiveSheetId"];
  getActiveSheet: CorePlugin["getActiveSheet"];
  getEvaluationSheets: CorePlugin["getEvaluationSheets"];
  getSheet: CorePlugin["getSheet"];
  getSheetName: CorePlugin["getSheetName"];
  getSheetIdByName: CorePlugin["getSheetIdByName"];
  getSheets: CorePlugin["getSheets"];
  getVisibleSheets: CorePlugin["getVisibleSheets"];
  getCol: CorePlugin["getCol"];
  getRow: CorePlugin["getRow"];
  getCells: CorePlugin["getCells"];
  getColCells: CorePlugin["getColCells"];
  getColsZone: CorePlugin["getColsZone"];
  getRowsZone: CorePlugin["getRowsZone"];
  getGridSize: CorePlugin["getGridSize"];
  getRangeValues: CorePlugin["getRangeValues"];
  getRangeFormattedValues: CorePlugin["getRangeFormattedValues"];
  shouldShowFormulas: CorePlugin["shouldShowFormulas"];

  getCellWidth: FormattingPlugin["getCellWidth"];
  getTextWidth: FormattingPlugin["getTextWidth"];
  getCellHeight: FormattingPlugin["getCellHeight"];

  expandZone: MergePlugin["expandZone"];
  isMergeDestructive: MergePlugin["isMergeDestructive"];
  isInMerge: MergePlugin["isInMerge"];
  getMainCell: MergePlugin["getMainCell"];
  doesIntersectMerge: MergePlugin["doesIntersectMerge"];
  isInSameMerge: MergePlugin["isInSameMerge"];
  getMerges: MergePlugin["getMerges"];
  getMerge: MergePlugin["getMerge"];

  getConditionalFormats: ConditionalFormatPlugin["getConditionalFormats"];
  getConditionalStyle: ConditionalFormatPlugin["getConditionalStyle"];
  getRulesSelection: ConditionalFormatPlugin["getRulesSelection"];

  getCurrentStyle: FormattingPlugin["getCurrentStyle"];
  getCellStyle: FormattingPlugin["getCellStyle"];
  getCellBorder: FormattingPlugin["getCellBorder"];

  canUndo: WHistory["canUndo"];
  canRedo: WHistory["canRedo"];

  evaluateFormula: EvaluationPlugin["evaluateFormula"];
  isIdle: EvaluationPlugin["isIdle"];

  getFigures: FigurePlugin["getFigures"];
  getSelectedFigureId: FigurePlugin["getSelectedFigureId"];
  getFigure: FigurePlugin["getFigure"];

  getChartRuntime: ChartPlugin["getChartRuntime"];
}

export type Getters = UIGetters & BaseGetters;
