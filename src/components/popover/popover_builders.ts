import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { ErrorToolTipPopoverBuilder } from "../error_tooltip/error_tooltip";
import { FilterMenuPopoverBuilder } from "../filters/filter_menu/filter_menu";
import { LinkCellPopoverBuilder } from "../link/link_display/link_display";
import { LinkEditorPopoverBuilder } from "../link/link_editor/link_editor";

cellPopoverRegistry
  .add("ErrorToolTip", ErrorToolTipPopoverBuilder)
  .add("LinkCell", LinkCellPopoverBuilder)
  .add("LinkEditor", LinkEditorPopoverBuilder)
  .add("FilterMenu", FilterMenuPopoverBuilder);
