import { MergePlugin } from "../plugins/merge";
import { ClipboardPlugin } from "../plugins/clipboard";
import { SelectionPlugin } from "../plugins/selection";
import { CorePlugin } from "../plugins/core";
import { ConditionalFormatPlugin } from "../plugins/conditional_format";
import { RendererPlugin } from "../plugins/renderer";
import { FormattingPlugin } from "../plugins/formatting";
import { WHistory } from "../history";
import { EvaluationPlugin } from "../plugins/evaluation";
import { EditionPlugin } from "../plugins/edition";
import { AutofillPlugin } from "../plugins/autofill";
import { HighlightPlugin } from "../plugins/highlight";
import { SelectionInputPlugin } from "../plugins/selection_inputs";
import { FigurePlugin } from "../plugins/figures";
import { ChartPlugin } from "../plugins/chart";
import { SheetPlugin } from "../plugins/sheet";
import { FindAndReplacePlugin } from "../plugins/find_and_replace";
import { UIOptionsPlugin } from "../plugins/ui_options";
import { SheetUIPlugin } from "../plugins/ui_sheet";

// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------
export interface Getters {
  applyOffset: SheetPlugin["applyOffset"];
  getEvaluationSheets: SheetPlugin["getEvaluationSheets"];
  getSheet: SheetPlugin["getSheet"];
  getSheetName: SheetPlugin["getSheetName"];
  getSheetIdByName: SheetPlugin["getSheetIdByName"];
  getSheets: SheetPlugin["getSheets"];
  getVisibleSheets: SheetPlugin["getVisibleSheets"];
  getCol: SheetPlugin["getCol"];
  getRow: SheetPlugin["getRow"];
  getCell: SheetPlugin["getCell"];
  getCellPosition: SheetPlugin["getCellPosition"];
  getColCells: SheetPlugin["getColCells"];
  getColsZone: SheetPlugin["getColsZone"];
  getRowsZone: SheetPlugin["getRowsZone"];
  getGridSize: SheetPlugin["getGridSize"];
  getCellByXc: SheetPlugin["getCellByXc"];

  zoneToXC: CorePlugin["zoneToXC"];
  getCells: CorePlugin["getCells"];
  getRangeValues: CorePlugin["getRangeValues"];
  getRangeFormattedValues: CorePlugin["getRangeFormattedValues"];

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
  isInSameMerge: MergePlugin["isInSameMerge"];
  getMerges: MergePlugin["getMerges"];
  getMerge: MergePlugin["getMerge"];

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

  getActiveSheetId: SheetUIPlugin["getActiveSheetId"];
  getActiveSheet: SheetUIPlugin["getActiveSheet"];

  shouldShowFormulas: UIOptionsPlugin["shouldShowFormulas"];

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
  isSelectingForComposer: EditionPlugin["isSelectingForComposer"];
  getCurrentContent: EditionPlugin["getCurrentContent"];
  getEditionSheet: EditionPlugin["getEditionSheet"];
  getComposerSelection: EditionPlugin["getComposerSelection"];
  getTokenAtCursor: EditionPlugin["getTokenAtCursor"];

  getAutofillTooltip: AutofillPlugin["getAutofillTooltip"];

  getSelectionInput: SelectionInputPlugin["getSelectionInput"];
  getSelectionInputValue: SelectionInputPlugin["getSelectionInputValue"];
  getFigures: FigurePlugin["getFigures"];
  getSelectedFigureId: FigurePlugin["getSelectedFigureId"];
  getFigure: FigurePlugin["getFigure"];

  getChartRuntime: ChartPlugin["getChartRuntime"];

  getSearchMatches: FindAndReplacePlugin["getSearchMatches"];
  getCurrentSelectedMatchIndex: FindAndReplacePlugin["getCurrentSelectedMatchIndex"];
}
