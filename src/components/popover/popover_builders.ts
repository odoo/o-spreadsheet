import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { DashboardExpandPivotPopoverBuilder } from "../dashboard_expand_pivot_button/dashboard_expand_pivot_button";
import { ErrorToolTipPopoverBuilder } from "../error_tooltip/error_tooltip";
import { FilterMenuPopoverBuilder } from "../filters/filter_menu/filter_menu";
import { LinkCellPopoverBuilder, LinkEditorPopoverBuilder } from "../link";

cellPopoverRegistry
  .add("ErrorToolTip", ErrorToolTipPopoverBuilder)
  .add("DashboardPopoverMenu", DashboardExpandPivotPopoverBuilder)
  .add("LinkCell", LinkCellPopoverBuilder)
  .add("LinkEditor", LinkEditorPopoverBuilder)
  .add("FilterMenu", FilterMenuPopoverBuilder);
