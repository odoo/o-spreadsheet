import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { ErrorToolTipPopoverBuilder } from "../error_tooltip/error_tooltip";
import { FilterMenuPopoverBuilder } from "../filters/filter_menu/filter_menu";
import { LinkCellPopoverBuilder, LinkEditorPopoverBuilder } from "../link";
import { PivotSortingToolTipPopoverBuilder } from "../pivot_sorting_popover/pivot_sorting_popopver";

cellPopoverRegistry
  .add("ErrorToolTip", ErrorToolTipPopoverBuilder)
  .add("PivotSortingToolTip", PivotSortingToolTipPopoverBuilder)
  .add("LinkCell", LinkCellPopoverBuilder)
  .add("LinkEditor", LinkEditorPopoverBuilder)
  .add("FilterMenu", FilterMenuPopoverBuilder);
