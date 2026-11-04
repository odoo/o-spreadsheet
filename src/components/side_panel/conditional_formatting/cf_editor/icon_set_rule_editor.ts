import { usePlugin } from "@odoo/owl";
import { localizeContent } from "../../../../helpers/locale";
import { _t } from "../../../../translation";
import { CommandResult } from "../../../../types/commands";
import { ValueAndLabel } from "../../../../types/misc";
import { PropsOf } from "../../../../types/props_of";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { IconPicker } from "../../../icon_picker/icon_picker";
import { OSComponent } from "../../../os_component";
import { Select } from "../../../select/select";
import { ConditionalFormattingEditorPlugin } from "./cf_editor_owl_plugin";

export class IconSetRuleEditor extends OSComponent {
  static template = "o-spreadsheet-IconSetRuleEditor";
  static components = {
    IconPicker,
    StandaloneComposer,
    Select,
  };
  cfEditorPlugin = usePlugin(ConditionalFormattingEditorPlugin);

  get rule() {
    return this.cfEditorPlugin.state.rules.iconSet;
  }

  getIconName(iconSet: "arrows" | "smiley" | "dots", iconType: "good" | "neutral" | "bad") {
    return this.cfEditorPlugin.iconSets[iconSet][iconType];
  }

  getIconTemplate(icon: string) {
    return `o-spreadsheet-Icon.${this.cfEditorPlugin.icons[icon].template}`;
  }

  isInflectionPointInvalid(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint"
  ): boolean {
    const errors = this.cfEditorPlugin.state.errors;
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
    const inflection = this.cfEditorPlugin.state.rules.iconSet[inflectionPoint];
    const isInvalid = this.isInflectionPointInvalid(inflectionPoint);
    return {
      onConfirm: (str: string) => {
        inflection.value = str;
        this.cfEditorPlugin.updateConditionalFormat({
          rule: this.cfEditorPlugin.state.rules.iconSet,
        });
      },
      composerContent: inflection.value || "",
      placeholder: _t("Formula"),
      defaultStatic: true,
      invalid: isInvalid,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.model().getters.getActiveSheetId(),
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
    const locale = this.model().getters.getLocale();
    return value ? localizeContent(value, locale) : "";
  }
}
