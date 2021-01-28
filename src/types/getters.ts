import { WHistory } from "../history";
import { BordersPlugin } from "../plugins/core/borders";
import { CellPlugin } from "../plugins/core/cell";
import { ChartPlugin } from "../plugins/core/chart";
import { ConditionalFormatPlugin } from "../plugins/core/conditional_format";
import { FigurePlugin } from "../plugins/core/figures";
import { MergePlugin } from "../plugins/core/merge";
import { RangePlugin } from "../plugins/core/range";
import { SheetPlugin } from "../plugins/core/sheet";
import { AutofillPlugin } from "../plugins/ui/autofill";
import { ClipboardPlugin } from "../plugins/ui/clipboard";
import { EditionPlugin } from "../plugins/ui/edition";
import { EvaluationPlugin } from "../plugins/ui/evaluation";
import { EvaluationChartPlugin } from "../plugins/ui/evaluation_chart";
import { EvaluationConditionalFormatPlugin } from "../plugins/ui/evaluation_conditional_format";
import { FindAndReplacePlugin } from "../plugins/ui/find_and_replace";
import { HighlightPlugin } from "../plugins/ui/highlight";
import { RendererPlugin } from "../plugins/ui/renderer";
import { SelectionPlugin } from "../plugins/ui/selection";
import { SelectionInputPlugin } from "../plugins/ui/selection_inputs";
import { SortPlugin } from "../plugins/ui/sort";
import { UIOptionsPlugin } from "../plugins/ui/ui_options";
import { SheetUIPlugin } from "../plugins/ui/ui_sheet";
// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------

export interface CoreGetters {
  canUndo: WHistory["canUndo"];
  canRedo: WHistory["canRedo"];
  applyOffset: SheetPlugin["applyOffset"];
  getEvaluationSheets: SheetPlugin["getEvaluationSheets"];
  getSheet: SheetPlugin["getSheet"];
  tryGetSheet: SheetPlugin["tryGetSheet"];
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
  getFormulaCellContent: CellPlugin["getFormulaCellContent"];
  getCellText: CellPlugin["getCellText"];
  getCellValue: CellPlugin["getCellValue"];
  getCellStyle: CellPlugin["getCellStyle"];

  getClipboardContent: ClipboardPlugin["getClipboardContent"];
  isPaintingFormat: ClipboardPlugin["isPaintingFormat"];
  getPasteZones: ClipboardPlugin["getPasteZones"];

  expandZone: MergePlugin["expandZone"];
  isMergeDestructive: MergePlugin["isMergeDestructive"];
  isInMerge: MergePlugin["isInMerge"];
  getMainCell: MergePlugin["getMainCell"];
  doesIntersectMerge: MergePlugin["doesIntersectMerge"];
  isInSameMerge: MergePlugin["isInSameMerge"];
  getMerges: MergePlugin["getMerges"];
  getMerge: MergePlugin["getMerge"];

  getConditionalFormats: ConditionalFormatPlugin["getConditionalFormats"];
  getRulesSelection: ConditionalFormatPlugin["getRulesSelection"];
  getRulesByCell: ConditionalFormatPlugin["getRulesByCell"];

  getFigures: FigurePlugin["getFigures"];
  getFigure: FigurePlugin["getFigure"];
  getVisibleFigures: FigurePlugin["getVisibleFigures"];
  getSelectedFigureId: FigurePlugin["getSelectedFigureId"];

  getCellBorder: BordersPlugin["getCellBorder"];

  getChartDefinition: ChartPlugin["getChartDefinition"];
  getChartDefinitionUI: ChartPlugin["getChartDefinitionUI"];

  getRangeById: RangePlugin["getRangeById"];
  getRangeString: RangePlugin["getRangeString"];
  getRangeFromSheetXC: RangePlugin["getRangeFromSheetXC"];
}

export type Getters = CoreGetters & {
  getActiveCell: SelectionPlugin["getActiveCell"];
  getActiveCols: SelectionPlugin["getActiveCols"];
  getActiveRows: SelectionPlugin["getActiveRows"];
  getCurrentStyle: SelectionPlugin["getCurrentStyle"];
  getSelectedZones: SelectionPlugin["getSelectedZones"];
  getSelectedZone: SelectionPlugin["getSelectedZone"];
  getSelection: SelectionPlugin["getSelection"];
  getPosition: SelectionPlugin["getPosition"];
  getAggregate: SelectionPlugin["getAggregate"];
  getSelectionMode: SelectionPlugin["getSelectionMode"];
  isSelected: SelectionPlugin["isSelected"];

  getActiveSheetId: SheetUIPlugin["getActiveSheetId"];
  getActiveSheet: SheetUIPlugin["getActiveSheet"];
  getCellWidth: SheetUIPlugin["getCellWidth"];
  getCellHeight: SheetUIPlugin["getCellHeight"];

  getRangeFormattedValues: EvaluationPlugin["getRangeFormattedValues"];
  evaluateFormula: EvaluationPlugin["evaluateFormula"];
  isIdle: EvaluationPlugin["isIdle"];
  getRangeValues: EvaluationPlugin["getRangeValues"];

  shouldShowFormulas: UIOptionsPlugin["shouldShowFormulas"];
  getChartRuntime: EvaluationChartPlugin["getChartRuntime"];

  getConditionalStyle: EvaluationConditionalFormatPlugin["getConditionalStyle"];

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

  getSearchMatches: FindAndReplacePlugin["getSearchMatches"];
  getCurrentSelectedMatchIndex: FindAndReplacePlugin["getCurrentSelectedMatchIndex"];

  getContiguousZone: SortPlugin["getContiguousZone"];
};
