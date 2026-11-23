import { proxy, signal, usePlugin, useProps } from "@odoo/owl";
import { DEFAULT_BORDER_DESC } from "../../constants";
import { ViewportsPlugin } from "../../owl_plugins/viewports_owl_plugin";
import { BorderPosition, BorderStyle, Color, Pixel } from "../../types/misc";
import { Rect } from "../../types/rendering";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { ToolBarDropdownPlugin, useToolBarDropdownPlugin } from "../helpers/top_bar_tool_hook";
import { OSComponent } from "../os_component";
import { types } from "../props_validation";
import { BorderEditor } from "./border_editor";

interface State {
  currentColor: Color;
  currentStyle: BorderStyle;
  currentPosition: BorderPosition | undefined;
}

export class BorderEditorWidget extends OSComponent {
  static template = "o-spreadsheet-BorderEditorWidget";
  static components = { BorderEditor };

  protected props = useProps({
    disabled: types.boolean().optional(),
    dropdownMaxHeight: types.Pixel().optional(),
    class: types.string().optional(),
  });
  topBarToolPlugin!: ToolBarDropdownPlugin;
  private viewPlugin = usePlugin(ViewportsPlugin);

  borderEditorButtonRef = signal.ref();
  state: State = proxy({
    currentColor: DEFAULT_BORDER_DESC.color,
    currentStyle: DEFAULT_BORDER_DESC.style,
    currentPosition: undefined,
  });

  setup() {
    this.topBarToolPlugin = useToolBarDropdownPlugin();
  }

  get dropdownMaxHeight(): Pixel {
    return this.viewPlugin.sheetViewDimension.height;
  }

  get borderEditorAnchorRect(): Rect {
    return getElBoundingRect(this.borderEditorButtonRef());
  }

  onBorderPositionPicked(position: BorderPosition) {
    this.state.currentPosition = position;
    this.updateBorder();
  }

  onBorderColorPicked(color: Color) {
    this.state.currentColor = color;
    this.updateBorder();
  }

  onBorderStylePicked(style: BorderStyle) {
    this.state.currentStyle = style;
    this.updateBorder();
  }

  get isActive(): boolean {
    return this.topBarToolPlugin.isActive;
  }

  toggleBorderEditor() {
    if (this.isActive) {
      this.topBarToolPlugin.closeDropdowns();
    } else {
      this.state.currentPosition = undefined;
      this.topBarToolPlugin.openDropdown();
    }
  }

  private updateBorder() {
    if (this.state.currentPosition === undefined) {
      return;
    }
    this.model().dispatch("SET_ZONE_BORDERS", {
      sheetId: this.model().getters.getActiveSheetId(),
      target: this.model().getters.getSelectedZones(),
      border: {
        position: this.state.currentPosition,
        color: this.state.currentColor,
        style: this.state.currentStyle,
      },
    });
  }
}
