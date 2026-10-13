import { signal, useProps } from "@odoo/owl";
import { USABLE_FONTS } from "../../constants";
import { Font } from "../../types/misc";
import { PropsOf } from "../../types/props_of";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { OSComponent } from "../os_component";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

export class FontEditor extends OSComponent {
  static template = "o-spreadsheet-FontEditor";
  static components = { Popover };

  protected props = useProps({
    currentFont: types.string(),
    onFontChanged: types.function<(font: Font) => void>(),
    showDropdown: types.boolean(),
    toggleDropdown: types.function(),
    class: types.string().optional(),
  });

  fonts = USABLE_FONTS;
  dropdownRef = signal.ref();

  get popoverProps(): PropsOf<Popover> {
    return {
      anchorRect: getElBoundingRect(this.dropdownRef()),
      positioning: "bottom-left",
    };
  }
}
