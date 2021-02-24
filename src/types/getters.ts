import { WHistory } from "../history";
import { AutofillPlugin } from "../plugins/autofill";
import { ChartPlugin } from "../plugins/chart";
import { ClipboardPlugin } from "../plugins/clipboard";
import { ConditionalFormatPlugin } from "../plugins/conditional_format";
import { CorePlugin } from "../plugins/core";
import { EditionPlugin } from "../plugins/edition";
import { EvaluationPlugin } from "../plugins/evaluation";
import { FigurePlugin } from "../plugins/figures";
import { FormattingPlugin } from "../plugins/formatting";
import { HighlightPlugin } from "../plugins/highlight";
import { MergePlugin } from "../plugins/merge";
import { RendererPlugin } from "../plugins/renderer";
import { SelectionPlugin } from "../plugins/selection";
import { SelectionInputPlugin } from "../plugins/selection_inputs";

// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------
export interface Getters {
  applyOffset: CorePlugin["applyOffset"];
  getCell: CorePlugin["getCell"];
  getCellText: CorePlugin["getCellText"];
  zoneToXC: CorePlugin["zoneToXC"];

  getActiveSheet: CorePlugin["getActiveSheet"];
  getSheetName: CorePlugin["getSheetName"];
  getSheetIdByName: CorePlugin["getSheetIdByName"];
  getSheets: CorePlugin["getSheets"];
  getCol: CorePlugin["getCol"];
  getRow: CorePlugin["getRow"];
  getColCells: CorePlugin["getColCells"];
  getNumberCols: CorePlugin["getNumberCols"];
  getNumberRows: CorePlugin["getNumberRows"];
  getColsZone: CorePlugin["getColsZone"];
  getRowsZone: CorePlugin["getRowsZone"];
  getGridSize: CorePlugin["getGridSize"];
  getRangeValues: CorePlugin["getRangeValues"];
  getRangeFormattedValues: CorePlugin["getRangeFormattedValues"];
  shouldShowFormulas: CorePlugin["shouldShowFormulas"];

  getClipboardContent: ClipboardPlugin["getClipboardContent"];
  isPaintingFormat: ClipboardPlugin["isPaintingFormat"];
  getPasteZones: ClipboardPlugin["getPasteZones"];

  getCellWidth: FormattingPlugin["getCellWidth"];
  getTextWidth: FormattingPlugin["getTextWidth"];
  getCellHeight: FormattingPlugin["getCellHeight"];

  expandZone: MergePlugin["expandZone"];
  isMergeDestructive: MergePlugin["isMergeDestructive"];
  isInMerge: MergePlugin["isInMerge"];
  getMainCell: MergePlugin["getMainCell"];
  doesIntersectMerge: MergePlugin["doesIntersectMerge"];

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

  getConditionalFormats: ConditionalFormatPlugin["getConditionalFormats"];
  getConditionalStyle: ConditionalFormatPlugin["getConditionalStyle"];
  getRulesSelection: ConditionalFormatPlugin["getRulesSelection"];

  getColIndex: RendererPlugin["getColIndex"];
  getRowIndex: RendererPlugin["getRowIndex"];
  getRect: RendererPlugin["getRect"];
  snapViewportToCell: RendererPlugin["snapViewportToCell"];
  adjustViewportPosition: RendererPlugin["adjustViewportPosition"];
  adjustViewportZone: RendererPlugin["adjustViewportZone"];

  getCurrentStyle: FormattingPlugin["getCurrentStyle"];
  getCellStyle: FormattingPlugin["getCellStyle"];
  getCellBorder: FormattingPlugin["getCellBorder"];

  canUndo: WHistory["canUndo"];
  canRedo: WHistory["canRedo"];

  evaluateFormula: EvaluationPlugin["evaluateFormula"];
  isIdle: EvaluationPlugin["isIdle"];

  getEditionMode: EditionPlugin["getEditionMode"];
  getCurrentContent: EditionPlugin["getCurrentContent"];
  getEditionSheet: EditionPlugin["getEditionSheet"];

  getAutofillTooltip: AutofillPlugin["getAutofillTooltip"];

  getSelectionInput: SelectionInputPlugin["getSelectionInput"];
  getSelectionInputValue: SelectionInputPlugin["getSelectionInputValue"];
  getFigures: FigurePlugin["getFigures"];
  getSelectedFigureId: FigurePlugin["getSelectedFigureId"];
  getFigure: FigurePlugin["getFigure"];

  getChartRuntime: ChartPlugin["getChartRuntime"];
}
