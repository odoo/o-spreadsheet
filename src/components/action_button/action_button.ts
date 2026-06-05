import { onWillUpdateProps, props } from "@odoo/owl";
import { createAction } from "../../actions/action";
import { Component } from "../../owl3_compatibility_layer";
import { PropsOf } from "../../types/props_of";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../helpers/css";
import { useModel } from "../owl_plugins/model_plugin";
import { types } from "../props_validation";

export class ActionButton extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ActionButton";

  protected props = props({
    action: types.ActionSpec(),
    "hasTriangleDownIcon?": types.boolean(),
    "selectedColor?": types.string(),
    "class?": types.string(),
    "onClick?": types.function(),
  });

  private actionButton = createAction(this.props.action);

  private model = useModel();
  setup() {
    onWillUpdateProps((nextProps: PropsOf<ActionButton>) => {
      if (nextProps.action !== this.props.action) {
        this.actionButton = createAction(nextProps.action);
      }
    });
  }

  get isVisible() {
    return this.actionButton.isVisible(this.model(), this.env);
  }

  get isEnabled() {
    const isLockedAvailable =
      this.actionButton.isEnabledOnLockedSheet || !this.model().getters.isCurrentSheetLocked();
    return this.actionButton.isEnabled(this.model(), this.env) && isLockedAvailable;
  }

  get isActive() {
    return this.actionButton.isActive?.(this.model(), this.env);
  }

  get title() {
    const name = this.actionButton.name(this.model(), this.env);
    const description =
      this.actionButton.description(this.model(), this.env) || this.actionButton.shortcut;
    return name + (description ? ` (${description})` : "");
  }

  get iconTitle() {
    return this.actionButton.icon(this.model(), this.env);
  }

  onClick(ev: MouseEvent) {
    if (this.isEnabled) {
      this.props.onClick?.(ev);
      this.actionButton.execute?.(this.model(), this.env);
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
