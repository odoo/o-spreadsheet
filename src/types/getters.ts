import { Session } from "../collaborative/session";
import { LocalHistory } from "../history/local_history";
import { BordersPlugin } from "../plugins/core/borders";
import { CellPlugin } from "../plugins/core/cell";
import { ChartPlugin } from "../plugins/core/chart";
import { ConditionalFormatPlugin } from "../plugins/core/conditional_format";
import { FigurePlugin } from "../plugins/core/figures";
import { MergePlugin } from "../plugins/core/merge";
import { RangeAdapter } from "../plugins/core/range";
import { SheetPlugin } from "../plugins/core/sheet";
import { AutofillPlugin } from "../plugins/ui/autofill";
import { AutomaticSumPlugin } from "../plugins/ui/automatic_sum";
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
import { SelectionMultiUserPlugin } from "../plugins/ui/selection_multiuser";
import { SortPlugin } from "../plugins/ui/sort";
import { UIOptionsPlugin } from "../plugins/ui/ui_options";
import { SheetUIPlugin } from "../plugins/ui/ui_sheet";
import { ViewportPlugin } from "../plugins/ui/viewport";
// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------

export interface CoreGetters {
  isReadonly: () => boolean;

  canUndo: LocalHistory["canUndo"];
  canRedo: LocalHistory["canRedo"];

  getEvaluationSheets: SheetPlugin["getEvaluationSheets"];
  getSheet: SheetPlugin["getSheet"];
  tryGetSheet: SheetPlugin["tryGetSheet"];
  getSheetName: SheetPlugin["getSheetName"];
  tryGetSheetName: SheetPlugin["tryGetSheetName"];
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
  getHiddenColsGroups: SheetPlugin["getHiddenColsGroups"];
  getHiddenRowsGroups: SheetPlugin["getHiddenColsGroups"];
  getGridLinesVisibility: SheetPlugin["getGridLinesVisibility"];
  getNumberRows: SheetPlugin["getNumberRows"];
  getNumberCols: SheetPlugin["getNumberCols"];
  getNextSheetName: SheetPlugin["getNextSheetName"];
  isEmpty: SheetPlugin["isEmpty"];

  zoneToXC: CellPlugin["zoneToXC"];
  getCells: CellPlugin["getCells"];
  getFormulaCellContent: CellPlugin["getFormulaCellContent"];
  buildFormulaContent: CellPlugin["buildFormulaContent"];
  getCellStyle: CellPlugin["getCellStyle"];
  getCellById: CellPlugin["getCellById"];

  getClipboardContent: ClipboardPlugin["getClipboardContent"];
  isPaintingFormat: ClipboardPlugin["isPaintingFormat"];

  expandZone: MergePlugin["expandZone"];
  isInMerge: MergePlugin["isInMerge"];
  getMainCell: MergePlugin["getMainCell"];
  getBottomLeftCell: MergePlugin["getBottomLeftCell"];
  doesIntersectMerge: MergePlugin["doesIntersectMerge"];
  doesColumnsHaveCommonMerges: MergePlugin["doesColumnsHaveCommonMerges"];
  doesRowsHaveCommonMerges: MergePlugin["doesRowsHaveCommonMerges"];
  isInSameMerge: MergePlugin["isInSameMerge"];
  getMerges: MergePlugin["getMerges"];
  getMerge: MergePlugin["getMerge"];
  isMergeHidden: MergePlugin["isMergeHidden"];
  isSingleCellOrMerge: MergePlugin["isSingleCellOrMerge"];

  getConditionalFormats: ConditionalFormatPlugin["getConditionalFormats"];
  getRulesSelection: ConditionalFormatPlugin["getRulesSelection"];
  getRulesByCell: ConditionalFormatPlugin["getRulesByCell"];

  getFigures: FigurePlugin["getFigures"];
  getFigure: FigurePlugin["getFigure"];
  getFigureSheetId: FigurePlugin["getFigureSheetId"];

  getCellBorder: BordersPlugin["getCellBorder"];

  getChartDefinition: ChartPlugin["getChartDefinition"];
  getChartsIdBySheet: ChartPlugin["getChartsIdBySheet"];
  getChartDefinitionUI: ChartPlugin["getChartDefinitionUI"];

  getRangeString: RangeAdapter["getRangeString"];
  getRangeFromSheetXC: RangeAdapter["getRangeFromSheetXC"];
  createAdaptedRanges: RangeAdapter["createAdaptedRanges"];
}

export type Getters = CoreGetters & {
  getActiveSheetId: SelectionPlugin["getActiveSheetId"];
  getActiveSheet: SelectionPlugin["getActiveSheet"];
  getActiveCell: SelectionPlugin["getActiveCell"];
  getActiveCols: SelectionPlugin["getActiveCols"];
  getActiveRows: SelectionPlugin["getActiveRows"];
  getCurrentStyle: SelectionPlugin["getCurrentStyle"];
  getSelectedZones: SelectionPlugin["getSelectedZones"];
  getSelectedZone: SelectionPlugin["getSelectedZone"];
  getSelection: SelectionPlugin["getSelection"];
  getSelectedFigureId: SelectionPlugin["getSelectedFigureId"];
  getVisibleFigures: SelectionPlugin["getVisibleFigures"];
  getPosition: SelectionPlugin["getPosition"];
  getSheetPosition: SelectionPlugin["getSheetPosition"];
  getAggregate: SelectionPlugin["getAggregate"];
  getSelectionMode: SelectionPlugin["getSelectionMode"];
  isSelected: SelectionPlugin["isSelected"];
  getElementsFromSelection: SelectionPlugin["getElementsFromSelection"];

  getClient: Session["getClient"];
  getConnectedClients: Session["getConnectedClients"];
  isFullySynchronized: Session["isFullySynchronized"];

  getCellWidth: SheetUIPlugin["getCellWidth"];
  getTextWidth: SheetUIPlugin["getTextWidth"];
  getCellHeight: SheetUIPlugin["getCellHeight"];
  getCellText: SheetUIPlugin["getCellText"];

  getRangeFormattedValues: EvaluationPlugin["getRangeFormattedValues"];
  evaluateFormula: EvaluationPlugin["evaluateFormula"];
  getRangeValues: EvaluationPlugin["getRangeValues"];

  shouldShowFormulas: UIOptionsPlugin["shouldShowFormulas"];
  getChartRuntime: EvaluationChartPlugin["getChartRuntime"];

  getConditionalStyle: EvaluationConditionalFormatPlugin["getConditionalStyle"];
  getConditionalIcon: EvaluationConditionalFormatPlugin["getConditionalIcon"];

  getHighlights: HighlightPlugin["getHighlights"];

  getColIndex: RendererPlugin["getColIndex"];
  getRowIndex: RendererPlugin["getRowIndex"];
  getRect: RendererPlugin["getRect"];
  isVisibleInViewport: RendererPlugin["isVisibleInViewport"];
  getEdgeScrollCol: RendererPlugin["getEdgeScrollCol"];
  getEdgeScrollRow: RendererPlugin["getEdgeScrollRow"];

  getEditionMode: EditionPlugin["getEditionMode"];
  isSelectingForComposer: EditionPlugin["isSelectingForComposer"];
  getCurrentContent: EditionPlugin["getCurrentContent"];
  getEditionSheet: EditionPlugin["getEditionSheet"];
  getComposerSelection: EditionPlugin["getComposerSelection"];
  getCurrentTokens: EditionPlugin["getCurrentTokens"];
  getTokenAtCursor: EditionPlugin["getTokenAtCursor"];
  getComposerHighlights: EditionPlugin["getComposerHighlights"];

  getAutofillTooltip: AutofillPlugin["getAutofillTooltip"];

  getSelectionInput: SelectionInputPlugin["getSelectionInput"];
  getSelectionInputValue: SelectionInputPlugin["getSelectionInputValue"];
  isRangeValid: SelectionInputPlugin["isRangeValid"];
  getSelectionInputHighlights: SelectionInputPlugin["getSelectionInputHighlights"];

  getSearchMatches: FindAndReplacePlugin["getSearchMatches"];
  getCurrentSelectedMatchIndex: FindAndReplacePlugin["getCurrentSelectedMatchIndex"];

  getContiguousZone: SortPlugin["getContiguousZone"];

  getClientsToDisplay: SelectionMultiUserPlugin["getClientsToDisplay"];

  getSnappedViewport: ViewportPlugin["getViewport"];
  getViewportDimension: ViewportPlugin["getViewportDimension"];
  getActiveViewport: ViewportPlugin["getActiveViewport"];
  getActiveSnappedViewport: ViewportPlugin["getActiveSnappedViewport"];
  getGridDimension: ViewportPlugin["getGridDimension"];
  getMaximumViewportOffset: ViewportPlugin["getMaximumViewportOffset"];

  getAutomaticSums: AutomaticSumPlugin["getAutomaticSums"];
};
