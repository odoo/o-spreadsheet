import { GridPlugin } from "../plugins/grid";
import { ClipboardPlugin } from "../plugins/clipboard";
import { EntityPlugin } from "../plugins/entity";
import { SelectionPlugin } from "../plugins/selection";
import { CorePlugin } from "../plugins/core";
import { ConditionalFormatPlugin } from "../plugins/conditional_format";
import { RendererPlugin } from "../plugins/renderer";
import { FormattingPlugin } from "../plugins/formatting";
import { WHistory } from "../history";
import { EvaluationPlugin } from "../plugins/evaluation";
import { EditionPlugin } from "../plugins/edition";

// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------
export interface Getters {
  getCell: CorePlugin["getCell"];
  getCellText: CorePlugin["getCellText"];
  zoneToXC: CorePlugin["zoneToXC"];
  getClipboardContent: ClipboardPlugin["getClipboardContent"];
  getClipboardZones: ClipboardPlugin["getClipboardZones"];
  isPaintingFormat: ClipboardPlugin["isPaintingFormat"];
  getCellWidth: FormattingPlugin["getCellWidth"];
  getCellHeight: FormattingPlugin["getCellHeight"];
  getColSize: GridPlugin["getColSize"];
  getRowSize: GridPlugin["getRowSize"];
  expandZone: GridPlugin["expandZone"];
  getColsZone: GridPlugin["getColsZone"];
  getRowsZone: GridPlugin["getRowsZone"];
  getGridSize: GridPlugin["getGridSize"];
  getEntity: EntityPlugin["getEntity"];
  getEntities: EntityPlugin["getEntities"];
  getActiveCell: SelectionPlugin["getActiveCell"];
  getActiveXc: SelectionPlugin["getActiveXc"];
  getActiveCols: SelectionPlugin["getActiveCols"];
  getActiveRows: SelectionPlugin["getActiveRows"];
  getSelectedZones: SelectionPlugin["getSelectedZones"];
  getSelection: SelectionPlugin["getSelection"];
  getPosition: SelectionPlugin["getPosition"];
  getAggregate: SelectionPlugin["getAggregate"];
  getConditionalFormats: ConditionalFormatPlugin["getConditionalFormats"];
  getConditionalStyle: ConditionalFormatPlugin["getConditionalStyle"];
  getUI: RendererPlugin["getUI"];
  getCol: RendererPlugin["getCol"];
  getRow: RendererPlugin["getRow"];
  isMergeDestructive: GridPlugin["isMergeDestructive"];
  isInMerge: GridPlugin["isInMerge"];
  getMainCell: GridPlugin["getMainCell"];
  getCurrentStyle: FormattingPlugin["getCurrentStyle"];
  getCellStyle: FormattingPlugin["getCellStyle"];
  getCellBorder: FormattingPlugin["getCellBorder"];
  canUndo: WHistory["canUndo"];
  canRedo: WHistory["canRedo"];
  evaluateFormula: EvaluationPlugin["evaluateFormula"];
  getEditionMode: EditionPlugin["getEditionMode"];
  getCurrentContent: EditionPlugin["getCurrentContent"];
  getHighlights: EditionPlugin["getHighlights"];
}
