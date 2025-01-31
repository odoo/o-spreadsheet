import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { DashboardPopoverMenuBuilder } from "../dashboard_menu_popover/dashboard_menu_popopver";
import { ErrorToolTipPopoverBuilder } from "../error_tooltip/error_tooltip";
import { FilterMenuPopoverBuilder } from "../filters/filter_menu/filter_menu";
import { LinkCellPopoverBuilder, LinkEditorPopoverBuilder } from "../link";

cellPopoverRegistry
  .add("ErrorToolTip", ErrorToolTipPopoverBuilder)
  .add("DashboardPopoverMenu", DashboardPopoverMenuBuilder)
  .add("LinkCell", LinkCellPopoverBuilder)
  .add("LinkEditor", LinkEditorPopoverBuilder)
  .add("FilterMenu", FilterMenuPopoverBuilder);
