import { onWillUpdateProps, useProps, useScope } from "@odoo/owl";
import { adaptShortcutStringToMacOs, createAction } from "../../actions/action";
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

  scope = useScope();

  private actionButton = createAction(this.props.action);

  setup() {
    onWillUpdateProps((nextProps: PropsOf<ActionButton>) => {
      if (nextProps.action !== this.props.action) {
        this.actionButton = createAction(nextProps.action);
      }
    });
  }

  get isVisible() {
    return this.scope.run(() => this.actionButton.isVisible(this.env));
  }

  get isEnabled() {
    const isLockedAvailable =
      this.actionButton.isEnabledOnLockedSheet || !this.env.model.getters.isCurrentSheetLocked();
    return this.scope.run(() => this.actionButton.isEnabled(this.env)) && isLockedAvailable;
  }

  get isActive() {
    return this.scope.run(() => this.actionButton.isActive?.(this.env));
  }

  get title() {
    const name = this.scope.run(() => this.actionButton.name(this.env));
    const description =
      this.scope.run(() => this.actionButton.description(this.env)) ||
      adaptShortcutStringToMacOs(this.actionButton.shortcut);
    return name + (description ? ` (${description})` : "");
  }

  get iconTitle() {
    return this.scope.run(() => this.actionButton.icon(this.env));
  }

  onClick(ev: MouseEvent) {
    if (this.isEnabled) {
      this.props.onClick?.(ev);
      this.scope.run(() => this.actionButton.execute?.(this.env));
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
