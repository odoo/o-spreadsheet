import { onWillUpdateProps, useProps } from "@odoo/owl";
import { adaptShortcutStringToMacOs, createAction } from "../../actions/action";
import { useSpreadsheetEnv } from "../../helpers/owl3_helpers";
import { Component } from "../../owl3_compatibility_layer";
import { PropsOf } from "../../types/props_of";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../helpers/css";
import { types } from "../props_validation";

export class ActionButton extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ActionButton";

  protected props = useProps({
    action: types.ActionSpec(),
    hasTriangleDownIcon: types.boolean().optional(),
    selectedColor: types.string().optional(),
    class: types.string().optional(),
    onClick: types.function<(ev: MouseEvent) => void>().optional(),
  });

  spEnv = useSpreadsheetEnv();

  private actionButton = createAction(this.props.action);

  setup() {
    onWillUpdateProps((nextProps: PropsOf<ActionButton>) => {
      if (nextProps.action !== this.props.action) {
        this.actionButton = createAction(nextProps.action);
      }
    });
  }

  get isVisible() {
    return this.actionButton.isVisible(this.spEnv);
  }

  get isEnabled() {
    const isLockedAvailable =
      this.actionButton.isEnabledOnLockedSheet || !this.env.model.getters.isCurrentSheetLocked();
    return this.actionButton.isEnabled(this.spEnv) && isLockedAvailable;
  }

  get isActive() {
    return this.actionButton.isActive?.(this.spEnv);
  }

  get title() {
    const name = this.actionButton.name(this.spEnv);
    const description =
      this.actionButton.description(this.spEnv) ||
      adaptShortcutStringToMacOs(this.actionButton.shortcut);
    return name + (description ? ` (${description})` : "");
  }

  get iconTitle() {
    return this.actionButton.icon(this.spEnv);
  }

  onClick(ev: MouseEvent) {
    if (this.isEnabled) {
      this.props.onClick?.(ev);
      this.actionButton.execute?.(this.spEnv);
    }
  }

  get buttonStyle() {
    if (this.props.selectedColor) {
      return cssPropertiesToCss({
        "border-bottom": `4px solid ${this.props.selectedColor}`,
        height: "16px",
        "margin-top": "2px",
      });
    }
    return "";
  }
}
