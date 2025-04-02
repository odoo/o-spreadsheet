import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { ErrorToolTipPopoverBuilder } from "../error_tooltip/error_tooltip";
import { FilterMenuBuilder } from "../filters/filter_menu/filter_menu";
import { LinkCellPopoverBuilder, LinkEditorPopoverBuilder } from "../link";

cellPopoverRegistry
  .add("ErrorToolTip", ErrorToolTipPopoverBuilder)
  .add("LinkCell", LinkCellPopoverBuilder)
  .add("LinkEditor", LinkEditorPopoverBuilder)
  .add("FilterMenu", FilterMenuBuilder);
