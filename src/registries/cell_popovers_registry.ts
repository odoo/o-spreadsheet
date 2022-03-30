import { ErrorToolTipPopoverBuilder } from "../components/error_tooltip/error_tooltip";
import { LinkCellPopoverBuilder, LinkEditorPopoverBuilder } from "../components/link";
import { Registry } from "../registry";
import { PopoverBuilders } from "../types/cell_popovers";

export const cellPopoverRegistry = new Registry<PopoverBuilders>();
cellPopoverRegistry
  .add("ErrorToolTip", ErrorToolTipPopoverBuilder)
  .add("LinkCell", LinkCellPopoverBuilder)
  .add("LinkEditor", LinkEditorPopoverBuilder);
