import { useProps } from "@odoo/owl";
import { DEFAULT_COLOR_SCALE_MIDPOINT_COLOR } from "../../../../constants";
import { colorNumberToHex } from "../../../../helpers/color";
import { localizeContent } from "../../../../helpers/locale";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { CommandResult } from "../../../../types/commands";
import { ColorScaleThreshold } from "../../../../types/conditional_formatting";
import { ValueAndLabel } from "../../../../types/misc";
import { PropsOf } from "../../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";

export class ColorScaleRuleEditorThreshold extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorScaleRuleEditorThreshold";
  static components = {
    RoundColorPicker,
    StandaloneComposer,
    Select,
  };
  protected props = useProps({
    store: types.Store<ConditionalFormattingEditorStore>(),
    thresholdType: types.or([
      types.literal("minimum"),
      types.literal("midpoint"),
      types.literal("maximum"),
    ]),
  });

  get rule() {
    return this.props.store.state.rules.colorScale;
  }

  get threshold() {
    return this.rule[this.props.thresholdType];
  }

  getThresholdColor(threshold?: ColorScaleThreshold) {
    return threshold
      ? colorNumberToHex(threshold.color)
      : colorNumberToHex(DEFAULT_COLOR_SCALE_MIDPOINT_COLOR);
  }

  isValueInvalid(): boolean {
    const errors = this.props.store.state.errors;
    switch (this.props.thresholdType) {
      case "minimum":
        return (
          errors.includes(CommandResult.MinInvalidFormula) ||
          errors.includes(CommandResult.MinBiggerThanMid) ||
          errors.includes(CommandResult.MinBiggerThanMax) ||
          errors.includes(CommandResult.MinNaN)
        );
      case "midpoint":
        return (
          errors.includes(CommandResult.MidInvalidFormula) ||
          errors.includes(CommandResult.MidNaN) ||
          errors.includes(CommandResult.MidBiggerThanMax)
        );
      case "maximum":
        return (
          errors.includes(CommandResult.MaxInvalidFormula) || errors.includes(CommandResult.MaxNaN)
        );
      default:
        return false;
    }
  }

  getColorScaleComposerProps(): PropsOf<StandaloneComposer> {
    const threshold = this.rule[this.props.thresholdType];
    if (!threshold) {
      throw new Error("Threshold not found");
    }
    const isInvalid = this.isValueInvalid();
    return {
      onConfirm: (str: string) => {
        threshold.value = str;
        this.props.store.updateConditionalFormat({ rule: this.rule });
      },
      composerContent: threshold.value || "",
      placeholder: _t("Formula"),
      defaultStatic: true,
      invalid: isInvalid,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.env.model.getters.getActiveSheetId(),
    };
  }

  getThresholdTypeSelectOptions(): ValueAndLabel[] {
    const options: ValueAndLabel[] = [
      { value: "number", label: _t("Number") },
      { value: "percentage", label: _t("Percentage") },
      { value: "percentile", label: _t("Percentile") },
      { value: "formula", label: _t("Formula") },
    ];
    if (this.props.thresholdType === "midpoint") {
      return [{ value: "none", label: _t("None") }, ...options];
    }
    return [{ value: "value", label: _t("Cell values") }, ...options];
  }

  localizeValue(value: string | undefined): string {
    const locale = this.env.model.getters.getLocale();
    return value ? localizeContent(value, locale) : "";
  }
}
