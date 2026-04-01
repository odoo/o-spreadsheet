import { Component } from "@odoo/owl";
import { _t } from "../../../../translation";
import { CommandResult, ValueAndLabel } from "../../../../types";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { IconPicker } from "../../../icon_picker/icon_picker";
import { Select } from "../../../select/select";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";

interface Props {
  store: Store<ConditionalFormattingEditorStore>;
}

export class IconSetRuleEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-IconSetRuleEditor";
  static components = {
    IconPicker,
    StandaloneComposer,
    Select,
  };
  static props = { store: Object };

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
  ): StandaloneComposer["props"] {
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
}
