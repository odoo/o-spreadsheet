import { GridPlugin } from "../plugins/grid";
import { ClipboardPlugin } from "../plugins/clipboard";
import { EntityPlugin } from "../plugins/entity";
import { SelectionPlugin } from "../plugins/selection";
import { CorePlugin } from "../plugins/core";
import { ConditionalFormatPlugin } from "../plugins/conditional_format";
import { LayouPlugin } from "../plugins/layout";
import { FormattingPlugin } from "../plugins/formatting";
import { WHistory } from "../history";

// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------
export interface Getters {
  getCell: CorePlugin["getCell"];
  getCellText: CorePlugin["getCellText"];
  zoneToXC: CorePlugin["zoneToXC"];
  expandZone: CorePlugin["expandZone"];
  getClipboardContent: ClipboardPlugin["getClipboardContent"];
  getClipboardZones: ClipboardPlugin["getClipboardZones"];
  isPaintingFormat: ClipboardPlugin["isPaintingFormat"];
  getCellWidth: FormattingPlugin["getCellWidth"];
  getCellHeight: FormattingPlugin["getCellHeight"];
  getColSize: GridPlugin["getColSize"];
  getRowSize: GridPlugin["getRowSize"];
  getCol: GridPlugin["getCol"];
  getRow: GridPlugin["getRow"];
  getEntity: EntityPlugin["getEntity"];
  getEntities: EntityPlugin["getEntities"];
  getActiveCell: SelectionPlugin["getActiveCell"];
  getActiveCols: SelectionPlugin["getActiveCols"];
  getActiveRows: SelectionPlugin["getActiveRows"];
  getSelectedZones: SelectionPlugin["getSelectedZones"];
  getAggregate: SelectionPlugin["getAggregate"];
  getConditionalFormats: ConditionalFormatPlugin["getConditionalFormats"];
  getViewport: LayouPlugin["getViewport"];
  getUI: LayouPlugin["getUI"];
  isMergeDestructive: GridPlugin["isMergeDestructive"];
  getCurrentStyle: FormattingPlugin["getCurrentStyle"];
  getCellStyle: FormattingPlugin["getCellStyle"];
  getCellBorder: FormattingPlugin["getCellBorder"];
  canUndo: WHistory["canUndo"];
  canRedo: WHistory["canRedo"];
}
