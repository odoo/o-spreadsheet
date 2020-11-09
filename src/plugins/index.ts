import { PluginConstuctor } from "../base_plugin";
import { Registry } from "../registry";
import { ClipboardPlugin } from "./clipboard";
import { ConditionalFormatPlugin } from "./conditional_format";
import { CorePlugin } from "./core";
import { EditionPlugin } from "./edition";
import { EvaluationPlugin } from "./evaluation";
import { FormattingPlugin } from "./formatting";
import { MergePlugin } from "./merge";
import { RendererPlugin } from "./renderer";
import { SelectionPlugin } from "./selection";
import { ChartPlugin } from "./chart";
import { AutofillPlugin } from "./autofill";
import { HighlightPlugin } from "./highlight";
import { SelectionInputPlugin } from "./selection_inputs";
import { FigurePlugin } from "./figures";
import { SheetPlugin } from "./sheet";
import { FindAndReplacePlugin } from "./find_and_replace";
import { WHistory } from "../history";

export const pluginRegistry = new Registry<PluginConstuctor>()
  .add("sheet", SheetPlugin)
  .add("core", CorePlugin)
  .add("evaluation", EvaluationPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("merge", MergePlugin)
  .add("formatting", FormattingPlugin)
  .add("selection", SelectionPlugin)
  .add("edition", EditionPlugin)
  .add("highlight", HighlightPlugin)
  .add("selectionInput", SelectionInputPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("figures", FigurePlugin)
  .add("chart", ChartPlugin)
  .add("grid renderer", RendererPlugin)
  .add("autofill", AutofillPlugin)
  .add("find_and_replace", FindAndReplacePlugin);

export interface WHistoryGetters {
  canUndo: WHistory["canUndo"];
  canRedo: WHistory["canRedo"];
}

export interface SheetGetters extends WHistoryGetters {
  applyOffset: SheetPlugin["applyOffset"];
  getActiveSheetId: SheetPlugin["getActiveSheetId"];
  getActiveSheet: SheetPlugin["getActiveSheet"];
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
}

export interface CoreGetters extends SheetGetters {
  getCellText: CorePlugin["getCellText"];
  zoneToXC: CorePlugin["zoneToXC"];
  getCells: CorePlugin["getCells"];
  getRangeValues: CorePlugin["getRangeValues"];
  getRangeFormattedValues: CorePlugin["getRangeFormattedValues"];
  shouldShowFormulas: CorePlugin["shouldShowFormulas"];
}

export interface EvaluationGetters extends CoreGetters {
  evaluateFormula: EvaluationPlugin["evaluateFormula"];
  isIdle: EvaluationPlugin["isIdle"];
}

export interface ClipboardGetters extends EvaluationGetters {
  getClipboardContent: ClipboardPlugin["getClipboardContent"];
  isPaintingFormat: ClipboardPlugin["isPaintingFormat"];
  getPasteZones: ClipboardPlugin["getPasteZones"];
}

export interface MergeGetters extends ClipboardGetters {
  expandZone: MergePlugin["expandZone"];
  isMergeDestructive: MergePlugin["isMergeDestructive"];
  isInMerge: MergePlugin["isInMerge"];
  getMainCell: MergePlugin["getMainCell"];
  doesIntersectMerge: MergePlugin["doesIntersectMerge"];
  isInSameMerge: MergePlugin["isInSameMerge"];
  getMerges: MergePlugin["getMerges"];
  getMerge: MergePlugin["getMerge"];
}

export interface FormattingGetters extends MergeGetters {
  getCellWidth: FormattingPlugin["getCellWidth"];
  getTextWidth: FormattingPlugin["getTextWidth"];
  getCellHeight: FormattingPlugin["getCellHeight"];
}

export interface SelectionGetters extends FormattingGetters {
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
}

export interface EditionGetters extends SelectionGetters {
  getEditionMode: EditionPlugin["getEditionMode"];
  isSelectingForComposer: EditionPlugin["isSelectingForComposer"];
  getCurrentContent: EditionPlugin["getCurrentContent"];
  getEditionSheet: EditionPlugin["getEditionSheet"];
  getComposerSelection: EditionPlugin["getComposerSelection"];
  getTokenAtCursor: EditionPlugin["getTokenAtCursor"];
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
  getFigures: FigurePlugin["getFigures"];
  getSelectedFigureId: FigurePlugin["getSelectedFigureId"];
  getFigure: FigurePlugin["getFigure"];
}

export interface ChartGetters extends FigureGetters {
  getChartRuntime: ChartPlugin["getChartRuntime"];
}

export interface RendererGetters extends ChartGetters {
  getColIndex: RendererPlugin["getColIndex"];
  getRowIndex: RendererPlugin["getRowIndex"];
  getRect: RendererPlugin["getRect"];
  snapViewportToCell: RendererPlugin["snapViewportToCell"];
  adjustViewportPosition: RendererPlugin["adjustViewportPosition"];
  adjustViewportZone: RendererPlugin["adjustViewportZone"];
}

export interface AutofillGetters extends RendererGetters {
  getAutofillTooltip: AutofillPlugin["getAutofillTooltip"];
}

export interface FindAndReplaceGetters extends AutofillGetters {
  getSearchMatches: FindAndReplacePlugin["getSearchMatches"];
  getCurrentSelectedMatchIndex: FindAndReplacePlugin["getCurrentSelectedMatchIndex"];
}

export interface Getters extends FindAndReplaceGetters {}
