import { GridPlugin } from "../model/plugins/grid";
import { ClipboardPlugin } from "../model/plugins/clipboard";
import { EntityPlugin } from "../model/plugins/entity";
import { SelectionPlugin } from "../model/plugins/selection";
import { CorePlugin } from "../model/plugins/core";
import { ConditionalFormatPlugin } from "../model/plugins/conditional_format";
import { LayouPlugin } from "../model/plugins/layout";
import { FormattingPlugin } from "../model/plugins/formatting";
import { WHistory } from "../model/history";

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
