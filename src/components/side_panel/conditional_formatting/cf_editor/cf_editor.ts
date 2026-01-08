import { DEFAULT_COLOR_SCALE_MIDPOINT_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Store } from "@odoo/o-spreadsheet-engine/types/store_engine";
import { Component, useEffect, useExternalListener } from "@odoo/owl";
import { colorNumberToHex, deepCopy } from "../../../../helpers";
import { useLocalStore } from "../../../../store_engine";
import {
  ColorScaleThreshold,
  CommandResult,
  ConditionalFormat,
  UID,
  ValueAndLabel,
} from "../../../../types";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { getTextDecoration } from "../../../helpers";
import { IconPicker } from "../../../icon_picker/icon_picker";
import { Select } from "../../../select/select";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { BadgeSelection } from "../../components/badge_selection/badge_selection";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";

interface Props {
  cf: ConditionalFormat;
  isNewCf: boolean;
  onCloseSidePanel: () => void;
}

export class ConditionalFormattingEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormattingEditor";
  static components = {
    SelectionInput,
    IconPicker,
    ColorPickerWidget,
    Section,
    RoundColorPicker,
    StandaloneComposer,
    BadgeSelection,
    ValidationMessages,
    Select,
  };
  static props = { cf: Object, isNewCf: Boolean, onCloseSidePanel: Function };

  getTextDecoration = getTextDecoration;
  colorNumberToHex = colorNumberToHex;

  private activeSheetId!: UID;
  private store!: Store<ConditionalFormattingEditorStore>;

  setup() {
    this.activeSheetId = this.env.model.getters.getActiveSheetId();
    this.store = useLocalStore(
      ConditionalFormattingEditorStore,
      deepCopy(this.props.cf),
      this.props.isNewCf
    );
    useEffect(
      (sheetId, isCfRemoved) => {
        if (this.activeSheetId !== sheetId || isCfRemoved) {
          this.env.replaceSidePanel(
            "ConditionalFormatting",
            `ConditionalFormattingEditor_${this.props.cf.id}`
          );
        }
      },
      () => [this.env.model.getters.getActiveSheetId(), this.isEditedCfRemoved]
    );
    useExternalListener(window as any, "click", () => this.store.closeMenus());
  }

  get isEditedCfRemoved() {
    return !Boolean(
      this.env.model.getters
        .getConditionalFormats(this.activeSheetId)
        .find((cf) => cf.id === this.props.cf.id)
    );
  }

  get cfTypesValues() {
    return [
      { value: "CellIsRule", label: _t("Single color") },
      { value: "ColorScaleRule", label: _t("Color scale") },
      { value: "IconSetRule", label: _t("Icon set") },
      { value: "DataBarRule", label: _t("Data bar") },
    ];
  }

  onSave() {
    this.store.updateConditionalFormat({});
    const isSuccessful = this.store.state.errors.length === 0;
    if (isSuccessful) {
      this.env.replaceSidePanel(
        "ConditionalFormatting",
        `ConditionalFormattingEditor_${this.props.cf.id}`
      );
    }
  }

  onCancel() {
    if (this.store.state.hasEditedCf) {
      if (this.props.isNewCf) {
        this.env.model.dispatch("REMOVE_CONDITIONAL_FORMAT", {
          sheetId: this.activeSheetId,
          id: this.props.cf.id,
        });
      } else {
        this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
          cf: this.props.cf,
          ranges: this.props.cf.ranges.map((range) =>
            this.env.model.getters.getRangeDataFromXc(this.activeSheetId, range)
          ),
          sheetId: this.activeSheetId,
        });
      }
    }
    this.env.replaceSidePanel(
      "ConditionalFormatting",
      `ConditionalFormattingEditor_${this.props.cf.id}`
    );
  }

  /*****************************************************************************
   * Color Scale Rule
   ****************************************************************************/

  getThresholdColor(threshold?: ColorScaleThreshold) {
    return threshold
      ? colorNumberToHex(threshold.color)
      : colorNumberToHex(DEFAULT_COLOR_SCALE_MIDPOINT_COLOR);
  }

  isValueInvalid(threshold: "minimum" | "midpoint" | "maximum"): boolean {
    const errors = this.store.state.errors;
    switch (threshold) {
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

  getColorScaleComposerProps(
    thresholdType: "minimum" | "midpoint" | "maximum"
  ): StandaloneComposer["props"] {
    const threshold = this.store.state.rules.colorScale[thresholdType];
    if (!threshold) {
      throw new Error("Threshold not found");
    }
    const isInvalid = this.isValueInvalid(thresholdType);
    return {
      onConfirm: (str: string) => {
        threshold.value = str;
        this.store.updateConditionalFormat({ rule: this.store.state.rules.colorScale });
      },
      composerContent: threshold.value || "",
      placeholder: _t("Formula"),
      defaultStatic: true,
      invalid: isInvalid,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.activeSheetId,
    };
  }

  /*****************************************************************************
   * Icon Set
   ****************************************************************************/

  isInflectionPointInvalid(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint"
  ): boolean {
    const errors = this.store.state.errors;
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
    const inflection = this.store.state.rules.iconSet[inflectionPoint];
    const isInvalid = this.isInflectionPointInvalid(inflectionPoint);
    return {
      onConfirm: (str: string) => {
        inflection.value = str;
        this.store.updateConditionalFormat({ rule: this.store.state.rules.iconSet });
      },
      composerContent: inflection.value || "",
      placeholder: _t("Formula"),
      defaultStatic: true,
      invalid: isInvalid,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.activeSheetId,
    };
  }

  getThresholdTypeSelectOptions(
    thresholdType: "minimum" | "midpoint" | "maximum" | "iconSet"
  ): ValueAndLabel[] {
    const options: ValueAndLabel[] = [
      { value: "number", label: _t("Number") },
      { value: "percentage", label: _t("Percentage") },
      { value: "percentile", label: _t("Percentile") },
      { value: "formula", label: _t("Formula") },
    ];
    if (thresholdType === "iconSet") {
      return options;
    }
    if (thresholdType === "midpoint") {
      return [{ value: "none", label: _t("None") }, ...options];
    }
    return [{ value: "value", label: _t("Cell values") }, ...options];
  }

  getIconSetOperatorSelectOptions(): ValueAndLabel[] {
    return [
      { value: "gt", label: ">" },
      { value: "ge", label: ">=" },
    ];
  }
}
