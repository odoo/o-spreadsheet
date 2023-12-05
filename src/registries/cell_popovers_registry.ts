import { ErrorToolTipPopoverBuilder } from "../components/error_tooltip/error_tooltip";
import { FilterMenuPopoverBuilder } from "../components/filters/filter_menu/filter_menu";
import { PopoverBuilders } from "../types/cell_popovers";
import { Registry } from "./registry";

export const cellPopoverRegistry = new Registry<PopoverBuilders>();
cellPopoverRegistry
  .add("ErrorToolTip", ErrorToolTipPopoverBuilder)
  .add("FilterMenu", FilterMenuPopoverBuilder);
