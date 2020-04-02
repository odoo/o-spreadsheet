import { GridPlugin } from "../plugins/grid";
import { ClipboardPlugin } from "../plugins/clipboard";
import { EntityPlugin } from "../plugins/entity";
import { SelectionPlugin } from "../plugins/selection";
import { CorePlugin } from "../plugins/core";
import { ConditionalFormatPlugin } from "../plugins/conditional_format";
import { LayoutPlugin } from "../plugins/layout";
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
  getViewport: LayoutPlugin["getViewport"];
  getUI: LayoutPlugin["getUI"];
  getCol: LayoutPlugin["getCol"];
  getRow: LayoutPlugin["getRow"];
  isMergeDestructive: GridPlugin["isMergeDestructive"];
  getCurrentStyle: FormattingPlugin["getCurrentStyle"];
  getCellStyle: FormattingPlugin["getCellStyle"];
  getCellBorder: FormattingPlugin["getCellBorder"];
  canUndo: WHistory["canUndo"];
  canRedo: WHistory["canRedo"];
  evaluateFormula: EvaluationPlugin["evaluateFormula"];
  isEditing: EditionPlugin["isEditing"];
}
