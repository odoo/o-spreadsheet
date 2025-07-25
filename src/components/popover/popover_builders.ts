import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { DashboardPivotFullScreenPopoverBuilder } from "../dashboard_pivot_full_screen_button/dashboard_pivot_full_screen_button";
import { ErrorToolTipPopoverBuilder } from "../error_tooltip/error_tooltip";
import { FilterMenuPopoverBuilder } from "../filters/filter_menu/filter_menu";
import { LinkCellPopoverBuilder, LinkEditorPopoverBuilder } from "../link";

cellPopoverRegistry
  .add("ErrorToolTip", ErrorToolTipPopoverBuilder)
  .add("DashboardPopoverMenu", DashboardPivotFullScreenPopoverBuilder)
  .add("LinkCell", LinkCellPopoverBuilder)
  .add("LinkEditor", LinkEditorPopoverBuilder)
  .add("FilterMenu", FilterMenuPopoverBuilder);
