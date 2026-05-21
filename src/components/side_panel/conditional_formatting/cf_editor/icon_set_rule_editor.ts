import { props } from "@odoo/owl";
import { localizeContent } from "../../../../helpers/locale";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { CommandResult } from "../../../../types/commands";
import { ValueAndLabel } from "../../../../types/misc";
import { PropsOf } from "../../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { IconPicker } from "../../../icon_picker/icon_picker";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";

export class IconSetRuleEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-IconSetRuleEditor";
  static components = {
    IconPicker,
    StandaloneComposer,
    Select,
  };
  protected props = props({
    store: types.Store<ConditionalFormattingEditorStore>(),
  });

  get rule() {
    return this.props.store.state.rules.iconSet;
  }

  getIconName(iconSet: "arrows" | "smiley" | "dots", iconType: "good" | "neutral" | "bad") {
    return this.props.store.iconSets[iconSet][iconType];
  }

  getIconTemplate(icon: string) {
    return `o-spreadsheet-Icon.${this.props.store.icons[icon].template}`;
  }

  isInflectionPointInvalid(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint"
  ): boolean {
    const errors = this.props.store.state.errors;
    switch (inflectionPoint) {
      case "lowerInflectionPoint":
        return (
          errors.includes(CommandResult.ValueLowerInflectionNaN) ||
          errors.includes(CommandResult.ValueLowerInvalidFormula) ||
          errors.includes(CommandResult.LowerBiggerThanUpper)
        );
      case "upperInflectionPoint":
        return (
          errors.includes(CommandResult.ValueUpperInflectionNaN) ||
          errors.includes(CommandResult.ValueUpperInvalidFormula) ||
          errors.includes(CommandResult.LowerBiggerThanUpper)
        );
      default:
        return true;
    }
  }

  getColorIconSetComposerProps(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint"
  ): PropsOf<StandaloneComposer> {
    const inflection = this.props.store.state.rules.iconSet[inflectionPoint];
    const isInvalid = this.isInflectionPointInvalid(inflectionPoint);
    return {
      onConfirm: (str: string) => {
        inflection.value = str;
        this.props.store.updateConditionalFormat({ rule: this.props.store.state.rules.iconSet });
      },
      composerContent: inflection.value || "",
      placeholder: _t("Formula"),
      defaultStatic: true,
      invalid: isInvalid,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.env.model.getters.getActiveSheetId(),
    };
  }

  getThresholdTypeSelectOptions(): ValueAndLabel[] {
    return [
      { value: "number", label: _t("Number") },
      { value: "percentage", label: _t("Percentage") },
      { value: "percentile", label: _t("Percentile") },
      { value: "formula", label: _t("Formula") },
    ];
  }

  getIconSetOperatorSelectOptions(): ValueAndLabel[] {
    return [
      { value: "gt", label: ">" },
      { value: "ge", label: ">=" },
    ];
  }

  localizeValue(value: string | undefined): string {
    const locale = this.env.model.getters.getLocale();
    return value ? localizeContent(value, locale) : "";
  }
}
