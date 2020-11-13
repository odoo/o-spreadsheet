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

// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------
export interface WHistoryGetters {
  canUndo: WHistory["canUndo"];
  canRedo: WHistory["canRedo"];
}

export interface SheetGetters extends WHistoryGetters {
  applyOffset: SheetPlugin["applyOffset"];
  getActiveSheet: SheetPlugin["getActiveSheet"];
  getActiveSheetId: SheetPlugin["getActiveSheetId"];
  getCell: SheetPlugin["getCell"];
  getCellByXc: SheetPlugin["getCellByXc"];
  getCellPosition: SheetPlugin["getCellPosition"];
  getCells: SheetPlugin["getCells"];
  getCol: SheetPlugin["getCol"];
  getColCells: SheetPlugin["getColCells"];
  getColsZone: SheetPlugin["getColsZone"];
  getEvaluationSheets: SheetPlugin["getEvaluationSheets"];
  getGridSize: SheetPlugin["getGridSize"];
  getRow: SheetPlugin["getRow"];
  getRowsZone: SheetPlugin["getRowsZone"];
  getSheet: SheetPlugin["getSheet"];
  getSheetIdByName: SheetPlugin["getSheetIdByName"];
  getSheetName: SheetPlugin["getSheetName"];
  getSheets: SheetPlugin["getSheets"];
  getVisibleSheets: SheetPlugin["getVisibleSheets"];
}

export interface CoreGetters extends SheetGetters {
  getCellText: CorePlugin["getCellText"];
  getRangeFormattedValues: CorePlugin["getRangeFormattedValues"];
  getRangeValues: CorePlugin["getRangeValues"];
  shouldShowFormulas: CorePlugin["shouldShowFormulas"];
}

export interface EvaluationGetters extends CoreGetters {
  evaluateFormula: EvaluationPlugin["evaluateFormula"];
  isIdle: EvaluationPlugin["isIdle"];
}

export interface MergeGetters extends EvaluationGetters {
  doesIntersectMerge: MergePlugin["doesIntersectMerge"];
  expandZone: MergePlugin["expandZone"];
  getMainCell: MergePlugin["getMainCell"];
  getMerge: MergePlugin["getMerge"];
  getMerges: MergePlugin["getMerges"];
  isInMerge: MergePlugin["isInMerge"];
  isInSameMerge: MergePlugin["isInSameMerge"];
  isMergeDestructive: MergePlugin["isMergeDestructive"];
  zoneToXC: MergePlugin["zoneToXC"];
}

export interface FormattingGetters extends MergeGetters {
  getCellBorder: FormattingPlugin["getCellBorder"];
  getCellHeight: FormattingPlugin["getCellHeight"];
  getCellStyle: FormattingPlugin["getCellStyle"];
  getCellWidth: FormattingPlugin["getCellWidth"];
  getTextWidth: FormattingPlugin["getTextWidth"];
}

export interface SelectionGetters extends FormattingGetters {
  getActiveCell: SelectionPlugin["getActiveCell"];
  getActiveCols: SelectionPlugin["getActiveCols"];
  getActiveRows: SelectionPlugin["getActiveRows"];
  getAggregate: SelectionPlugin["getAggregate"];
  getCurrentStyle: SelectionPlugin["getCurrentStyle"];
  getPosition: SelectionPlugin["getPosition"];
  getSelectedZone: SelectionPlugin["getSelectedZone"];
  getSelectedZones: SelectionPlugin["getSelectedZones"];
  getSelection: SelectionPlugin["getSelection"];
  getSelectionMode: SelectionPlugin["getSelectionMode"];
  isSelected: SelectionPlugin["isSelected"];
}

export interface ClipboardGetters extends SelectionGetters {
  getClipboardContent: ClipboardPlugin["getClipboardContent"];
  getPasteZones: ClipboardPlugin["getPasteZones"];
  isPaintingFormat: ClipboardPlugin["isPaintingFormat"];
}

export interface EditionGetters extends ClipboardGetters {
  getComposerSelection: EditionPlugin["getComposerSelection"];
  getCurrentContent: EditionPlugin["getCurrentContent"];
  getEditionMode: EditionPlugin["getEditionMode"];
  getEditionSheet: EditionPlugin["getEditionSheet"];
  getTokenAtCursor: EditionPlugin["getTokenAtCursor"];
  isSelectingForComposer: EditionPlugin["isSelectingForComposer"];
}

export interface HighlightGetters extends EditionGetters {
  getHighlights: HighlightPlugin["getHighlights"];
}

export interface SelectionInputGetters extends HighlightGetters {
  getSelectionInput: SelectionInputPlugin["getSelectionInput"];
  getSelectionInputValue: SelectionInputPlugin["getSelectionInputValue"];
}

export interface ConditionalFormatGetters extends SelectionInputGetters {
  getConditionalFormats: ConditionalFormatPlugin["getConditionalFormats"];
  getConditionalStyle: ConditionalFormatPlugin["getConditionalStyle"];
  getRulesSelection: ConditionalFormatPlugin["getRulesSelection"];
}

export interface FigureGetters extends ConditionalFormatGetters {
  getFigure: FigurePlugin["getFigure"];
  getFigures: FigurePlugin["getFigures"];
  getSelectedFigureId: FigurePlugin["getSelectedFigureId"];
}

export interface ChartGetters extends FigureGetters {
  getChartRuntime: ChartPlugin["getChartRuntime"];
}

export interface RendererGetters extends ChartGetters {
  adjustViewportPosition: RendererPlugin["adjustViewportPosition"];
  adjustViewportZone: RendererPlugin["adjustViewportZone"];
  getColIndex: RendererPlugin["getColIndex"];
  getRowIndex: RendererPlugin["getRowIndex"];
  snapViewportToCell: RendererPlugin["snapViewportToCell"];
}

export interface AutofillGetters extends RendererGetters {
  getAutofillTooltip: AutofillPlugin["getAutofillTooltip"];
}

export interface FindAndReplaceGetters extends AutofillGetters {
  getCurrentSelectedMatchIndex: FindAndReplacePlugin["getCurrentSelectedMatchIndex"];
  getSearchMatches: FindAndReplacePlugin["getSearchMatches"];
}

export interface Getters extends FindAndReplaceGetters {}
