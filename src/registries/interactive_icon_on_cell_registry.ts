import { getDataFilterIcon } from "@odoo/o-spreadsheet-engine/components/icons/icons";
import { GRID_ICON_EDGE_LENGTH, GRID_ICON_MARGIN } from "@odoo/o-spreadsheet-engine/constants";
import { relativeLuminance } from "@odoo/o-spreadsheet-engine/helpers/color";
import { iconsOnCellRegistry } from "@odoo/o-spreadsheet-engine/registries/icons_on_cell_registry";
import { CellPopoverStore } from "../components/popover";

iconsOnCellRegistry.add("filter_icon", (getters, position) => {
  const hasIcon = getters.isFilterHeader(position);
  if (hasIcon) {
    const isFilterActive = getters.isFilterActive(position);
    const cellStyle = getters.getCellComputedStyle(position);
    const isHighContrast = relativeLuminance(cellStyle.fillColor || "#fff") < 0.45;
    return {
      type: "filter_icon",
      svg: getDataFilterIcon(isFilterActive, isHighContrast, false),
      hoverSvg: getDataFilterIcon(isFilterActive, isHighContrast, true),
      priority: 3,
      horizontalAlign: "right",
      size: GRID_ICON_EDGE_LENGTH,
      margin: GRID_ICON_MARGIN,
      position,
      onClick: (position, env) => {
        const cellPopovers = env.getStore(CellPopoverStore);
        const activePopover = cellPopovers.persistentCellPopover;
        if (
          activePopover.isOpen &&
          activePopover.col === position.col &&
          activePopover.row === position.row &&
          activePopover.type === "FilterMenu"
        ) {
          cellPopovers.close();
          return;
        }
        cellPopovers.open(position, "FilterMenu");
      },
    };
  }
  return undefined;
});
