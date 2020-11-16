import { MergePlugin } from "../plugins/core/merge";
import { ClipboardPlugin } from "../plugins/ui/clipboard";
import { SelectionPlugin } from "../plugins/ui/selection";
import { CellPlugin } from "../plugins/core/cell";
import { ConditionalFormatPlugin } from "../plugins/core/conditional_format";
import { RendererPlugin } from "../plugins/ui/renderer";
import { FormattingPlugin } from "../plugins/core/formatting";
import { WHistory } from "../history";
import { EvaluationPlugin } from "../plugins/ui/evaluation";
import { EditionPlugin } from "../plugins/ui/edition";
import { AutofillPlugin } from "../plugins/ui/autofill";
import { HighlightPlugin } from "../plugins/ui/highlight";
import { SelectionInputPlugin } from "../plugins/ui/selection_inputs";
import { FigurePlugin } from "../plugins/core/figures";
import { ChartPlugin } from "../plugins/core/chart";
import { SheetPlugin } from "../plugins/core/sheet";
import { FindAndReplacePlugin } from "../plugins/ui/find_and_replace";
import { SheetUIPlugin } from "../plugins/ui/ui_sheet";
import { UIOptionsPlugin } from "../plugins/ui/ui_options";

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

  zoneToXC: CellPlugin["zoneToXC"];
  getCells: CellPlugin["getCells"];
  getRangeValues: CellPlugin["getRangeValues"];
  getRangeFormattedValues: CellPlugin["getRangeFormattedValues"];

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
