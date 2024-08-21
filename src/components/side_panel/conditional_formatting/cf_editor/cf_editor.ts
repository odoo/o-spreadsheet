import { Component, useExternalListener, useState } from "@odoo/owl";
import {
  ACTION_COLOR,
  BADGE_SELECTED_COLOR,
  CF_ICON_EDGE_LENGTH,
  DEFAULT_COLOR_SCALE_MIDPOINT_COLOR,
  GRAY_200,
  GRAY_300,
} from "../../../../constants";
import { colorNumberString, rangeReference } from "../../../../helpers";
import { canonicalizeCFRule } from "../../../../helpers/locale";
import { cycleFixedReference } from "../../../../helpers/reference_type";
import { _t } from "../../../../translation";
import {
  CancelledReason,
  CellIsRule,
  Color,
  ColorScaleRule,
  ColorScaleThreshold,
  CommandResult,
  ConditionalFormat,
  ConditionalFormatRule,
  DataBarRule,
  IconSetRule,
  SpreadsheetChildEnv,
} from "../../../../types";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { css, getTextDecoration } from "../../../helpers";
import { IconPicker } from "../../../icon_picker/icon_picker";
import { ICONS, ICON_SETS } from "../../../icons/icons";
import { SelectionInput } from "../../../selection_input/selection_input";
import { CellIsOperators, CfTerms } from "../../../translations_terms";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { BadgeSelection } from "../../components/badge_selection/badge_selection";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ConditionalFormatPreviewList } from "../cf_preview_list/cf_preview_list";

css/* scss */ `
  .o-cf-ruleEditor {
    .o-cf-preview-display {
      border: 1px solid ${GRAY_300};
      padding: 10px;
    }

    .o-cf-cell-is-rule {
      .o-divider {
        border-right: 1px solid ${GRAY_300};
        margin: 4px 6px;
      }
    }
    .o-cf-color-scale-editor {
      .o-threshold {
        .o-select-with-input {
          max-width: 150px;
        }
        .o-threshold-value {
          flex-grow: 1;
          flex-basis: 60%;
          min-width: 0px; // input overflows in Firefox otherwise
        }
        .o-threshold-value input:disabled {
          background-color: #edebed;
        }
      }
    }
    .o-cf-iconset-rule {
      .o-cf-clickable-icon {
        border: 1px solid ${GRAY_200};
        border-radius: 4px;
        cursor: pointer;
        &:hover {
          border-color: ${ACTION_COLOR};
          background-color: ${BADGE_SELECTED_COLOR};
        }
        .o-icon {
          width: ${CF_ICON_EDGE_LENGTH}px;
          height: ${CF_ICON_EDGE_LENGTH}px;
        }
      }
      .o-cf-iconsets {
        gap: 11px;
        .o-cf-iconset {
          padding: 7px 8px;
          width: 95px;
          .o-icon {
            margin: 0 3px;
          }
          svg {
            vertical-align: baseline;
          }
        }
      }
      .o-inflection {
        .o-cf-icon-button {
          padding: 4px 10px;
        }
        table {
          font-size: 13px;
          td {
            padding: 6px 0;
          }

          th.o-cf-iconset-icons {
            width: 25px;
          }
          th.o-cf-iconset-text {
            width: 82px;
          }
          th.o-cf-iconset-operator {
            width: 20px;
          }
          .o-cf-iconset-type {
            min-width: 80px;
          }
        }
      }
    }

    .o-icon.arrow-down {
      color: #e06666;
    }
    .o-icon.arrow-up {
      color: #6aa84f;
    }
  }
`;
interface Props {
  editedCf?: ConditionalFormat;
  onExitEdition: () => void;
}

type CFType = "CellIsRule" | "ColorScaleRule" | "IconSetRule" | "DataBarRule";

interface Rules {
  cellIs: CellIsRule;
  colorScale: ColorScaleRule;
  iconSet: IconSetRule;
  dataBar: DataBarRule;
}

type CFMenu =
  | "cellIsRule-textColor"
  | "cellIsRule-fillColor"
  | "colorScale-minimumColor"
  | "colorScale-midpointColor"
  | "colorScale-maximumColor"
  | "iconSet-lowerIcon"
  | "iconSet-middleIcon"
  | "iconSet-upperIcon";

interface State {
  currentCF: Omit<ConditionalFormat, "rule">;
  currentCFType: CFType;
  errors: CancelledReason[];
  rules: Rules;
  openedMenu?: CFMenu;
}

export class ConditionalFormattingEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormattingEditor";
  static props = {
    editedCf: { type: Object, optional: true },
    onExitEdition: Function,
  };
  static components = {
    SelectionInput,
    IconPicker,
    ColorPickerWidget,
    ConditionalFormatPreviewList,
    Section,
    RoundColorPicker,
    StandaloneComposer: StandaloneComposer,
    BadgeSelection,
    ValidationMessages,
  };

  icons = ICONS;
  cellIsOperators = CellIsOperators;
  iconSets = ICON_SETS;
  getTextDecoration = getTextDecoration;
  colorNumberString = colorNumberString;

  private state!: State;

  setup() {
    const cf = this.props.editedCf || {
      id: this.env.model.uuidGenerator.uuidv4(),
      ranges: this.env.model.getters
        .getSelectedZones()
        .map((zone) =>
          this.env.model.getters.zoneToXC(this.env.model.getters.getActiveSheetId(), zone)
        ),
    };

    this.state = useState<State>({
      currentCF: cf,
      currentCFType: this.props.editedCf?.rule.type || "CellIsRule",
      errors: [],
      rules: this.getDefaultRules(),
    });
    if (this.props.editedCf) {
      switch (this.props.editedCf.rule.type) {
        case "CellIsRule":
          this.state.rules.cellIs = this.props.editedCf.rule;
          break;
        case "ColorScaleRule":
          this.state.rules.colorScale = this.props.editedCf.rule;
          break;
        case "IconSetRule":
          this.state.rules.iconSet = this.props.editedCf.rule;
          break;
        case "DataBarRule":
          this.state.rules.dataBar = this.props.editedCf.rule;
          break;
      }
    }

    useExternalListener(window as any, "click", this.closeMenus);
  }

  get isRangeValid(): boolean {
    return this.state.errors.includes(CommandResult.EmptyRange);
  }

  get errorMessages(): string[] {
    return this.state.errors.map((error) => CfTerms.Errors[error] || CfTerms.Errors.Unexpected);
  }

  get cfTypesValues() {
    return [
      { value: "CellIsRule", label: _t("Single color") },
      { value: "ColorScaleRule", label: _t("Color scale") },
      { value: "IconSetRule", label: _t("Icon set") },
      { value: "DataBarRule", label: _t("Data bar") },
    ];
  }

  saveConditionalFormat() {
    if (this.state.currentCF) {
      const invalidRanges = this.state.currentCF.ranges.some((xc) => !xc.match(rangeReference));
      if (invalidRanges) {
        this.state.errors = [CommandResult.InvalidRange];
        return;
      }
      const sheetId = this.env.model.getters.getActiveSheetId();
      const locale = this.env.model.getters.getLocale();
      const result = this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: canonicalizeCFRule(this.getEditorRule(), locale),
          id: this.state.currentCF.id,
        },
        ranges: this.state.currentCF.ranges.map((xc) =>
          this.env.model.getters.getRangeDataFromXc(sheetId, xc)
        ),
        sheetId,
      });
      if (!result.isSuccessful) {
        this.state.errors = result.reasons;
      } else {
        this.props.onExitEdition();
      }
    }
  }

  /**
   * Get the rule currently edited with the editor
   */
  private getEditorRule(): ConditionalFormatRule {
    switch (this.state.currentCFType) {
      case "CellIsRule":
        return this.state.rules.cellIs;
      case "ColorScaleRule":
        return this.state.rules.colorScale;
      case "IconSetRule":
        return this.state.rules.iconSet;
      case "DataBarRule":
        return this.state.rules.dataBar;
    }
  }

  private getDefaultRules(): Rules {
    return {
      cellIs: {
        type: "CellIsRule",
        operator: "IsNotEmpty",
        values: [],
        style: { fillColor: "#b6d7a8" },
      },
      colorScale: {
        type: "ColorScaleRule",
        minimum: { type: "value", color: 0xffffff },
        midpoint: undefined,
        maximum: { type: "value", color: 0x6aa84f },
      },
      iconSet: {
        type: "IconSetRule",
        icons: {
          upper: "arrowGood",
          middle: "arrowNeutral",
          lower: "arrowBad",
        },
        upperInflectionPoint: {
          type: "percentage",
          value: "66",
          operator: "gt",
        },
        lowerInflectionPoint: {
          type: "percentage",
          value: "33",
          operator: "gt",
        },
      },
      dataBar: {
        type: "DataBarRule",
        color: 0xd9ead3,
      },
    };
  }

  changeRuleType(ruleType: CFType) {
    if (this.state.currentCFType === ruleType || !this.state.rules) {
      return;
    }
    this.state.errors = [];
    this.state.currentCFType = ruleType;
  }

  onRangesChanged(ranges: string[]) {
    if (this.state.currentCF) {
      this.state.currentCF.ranges = ranges;
    }
  }

  /*****************************************************************************
   * Common
   ****************************************************************************/

  toggleMenu(menu: CFMenu) {
    const isSelected: boolean = this.state.openedMenu === menu;
    this.closeMenus();
    if (!isSelected) {
      this.state.openedMenu = menu;
    }
  }

  private closeMenus() {
    this.state.openedMenu = undefined;
  }

  /*****************************************************************************
   * Cell Is Rule
   ****************************************************************************/

  get isValue1Invalid(): boolean {
    return (
      this.state.errors.includes(CommandResult.FirstArgMissing) ||
      this.state.errors.includes(CommandResult.ValueCellIsInvalidFormula)
    );
  }

  get isValue2Invalid(): boolean {
    return this.state.errors.includes(CommandResult.SecondArgMissing);
  }

  toggleStyle(tool: string) {
    const style = this.state.rules.cellIs.style;
    style[tool] = !style[tool];
    this.closeMenus();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === "F4") {
      const target = event.target as HTMLInputElement;
      const update = cycleFixedReference(
        { start: target.selectionStart ?? 0, end: target.selectionEnd ?? 0 },
        target.value,
        this.env.model.getters.getLocale()
      );
      if (!update) {
        return;
      }
      target.value = update.content;
      target.setSelectionRange(update.selection.start, update.selection.end);
      target.dispatchEvent(new Event("input"));
    }
  }

  setColor(target: string, color: Color) {
    this.state.rules.cellIs.style[target] = color;
    this.closeMenus();
  }

  /*****************************************************************************
   * Color Scale Rule
   ****************************************************************************/

  isValueInvalid(threshold: "minimum" | "midpoint" | "maximum"): boolean {
    switch (threshold) {
      case "minimum":
        return (
          this.state.errors.includes(CommandResult.MinInvalidFormula) ||
          this.state.errors.includes(CommandResult.MinBiggerThanMid) ||
          this.state.errors.includes(CommandResult.MinBiggerThanMax) ||
          this.state.errors.includes(CommandResult.MinNaN)
        );
      case "midpoint":
        return (
          this.state.errors.includes(CommandResult.MidInvalidFormula) ||
          this.state.errors.includes(CommandResult.MidNaN) ||
          this.state.errors.includes(CommandResult.MidBiggerThanMax)
        );
      case "maximum":
        return (
          this.state.errors.includes(CommandResult.MaxInvalidFormula) ||
          this.state.errors.includes(CommandResult.MaxNaN)
        );

      default:
        return false;
    }
  }

  setColorScaleColor(target: string, color: Color) {
    const point = this.state.rules.colorScale[target];
    if (point) {
      point.color = Number.parseInt(color.substr(1), 16);
    }
    this.closeMenus();
  }

  getPreviewGradient() {
    const rule = this.state.rules.colorScale;
    const minColor = colorNumberString(rule.minimum.color);
    const midColor = colorNumberString(rule.midpoint?.color || DEFAULT_COLOR_SCALE_MIDPOINT_COLOR);
    const maxColor = colorNumberString(rule.maximum.color);
    const baseString = "background-image: linear-gradient(to right, ";
    return rule.midpoint === undefined
      ? baseString + minColor + ", " + maxColor + ")"
      : baseString + minColor + ", " + midColor + ", " + maxColor + ")";
  }

  getThresholdColor(threshold?: ColorScaleThreshold) {
    return threshold
      ? colorNumberString(threshold.color)
      : colorNumberString(DEFAULT_COLOR_SCALE_MIDPOINT_COLOR);
  }

  onMidpointChange(ev) {
    const type = ev.target.value;
    const rule = this.state.rules.colorScale;
    if (type === "none") {
      rule.midpoint = undefined;
    } else {
      rule.midpoint = {
        color: DEFAULT_COLOR_SCALE_MIDPOINT_COLOR,
        value: "",
        ...rule.midpoint,
        type,
      };
    }
  }

  /*****************************************************************************
   * Icon Set
   ****************************************************************************/

  isInflectionPointInvalid(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint"
  ): boolean {
    switch (inflectionPoint) {
      case "lowerInflectionPoint":
        return (
          this.state.errors.includes(CommandResult.ValueLowerInflectionNaN) ||
          this.state.errors.includes(CommandResult.ValueLowerInvalidFormula) ||
          this.state.errors.includes(CommandResult.LowerBiggerThanUpper)
        );
      case "upperInflectionPoint":
        return (
          this.state.errors.includes(CommandResult.ValueUpperInflectionNaN) ||
          this.state.errors.includes(CommandResult.ValueUpperInvalidFormula) ||
          this.state.errors.includes(CommandResult.LowerBiggerThanUpper)
        );
      default:
        return true;
    }
  }

  reverseIcons() {
    const icons = this.state.rules.iconSet.icons;
    const upper = icons.upper;
    icons.upper = icons.lower;
    icons.lower = upper;
  }

  setIconSet(iconSet: "arrows" | "smiley" | "dots") {
    const icons = this.state.rules.iconSet.icons;
    icons.upper = this.iconSets[iconSet].good;
    icons.middle = this.iconSets[iconSet].neutral;
    icons.lower = this.iconSets[iconSet].bad;
  }

  setIcon(target: "upper" | "middle" | "lower", icon: string) {
    this.state.rules.iconSet.icons[target] = icon;
  }

  getCellIsRuleComposerProps(valueIndex: 0 | 1): StandaloneComposer["props"] {
    const isInvalid = valueIndex === 0 ? this.isValue1Invalid : this.isValue2Invalid;
    return {
      onConfirm: (str: string) => (this.state.rules.cellIs.values[valueIndex] = str),
      composerContent: this.state.rules.cellIs.values[valueIndex],
      placeholder: _t("Value or formula"),
      invalid: isInvalid,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.env.model.getters.getActiveSheetId(),
    };
  }

  getColorScaleComposerProps(
    thresholdType: "minimum" | "midpoint" | "maximum"
  ): StandaloneComposer["props"] {
    const threshold = this.state.rules.colorScale[thresholdType];
    if (!threshold) {
      throw new Error("Threshold not found");
    }
    const isInvalid = this.isValueInvalid(thresholdType);
    return {
      onConfirm: (str: string) => (threshold.value = str),
      composerContent: threshold.value || "",
      placeholder: _t("Formula"),
      invalid: isInvalid,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.env.model.getters.getActiveSheetId(),
    };
  }

  getColorIconSetComposerProps(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint"
  ): StandaloneComposer["props"] {
    const inflection = this.state.rules.iconSet[inflectionPoint];
    const isInvalid = this.isInflectionPointInvalid(inflectionPoint);
    return {
      onConfirm: (str: string) => (inflection.value = str),
      composerContent: inflection.value || "",
      placeholder: _t("Formula"),
      invalid: isInvalid,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.env.model.getters.getActiveSheetId(),
    };
  }

  /*****************************************************************************
   * DataBar
   ****************************************************************************/

  getRangeValues(): string[] {
    return [this.state.rules.dataBar.rangeValues || ""];
  }

  updateDataBarColor(color: Color) {
    this.state.rules.dataBar.color = Number.parseInt(color.substr(1), 16);
  }

  onDataBarRangeUpdate(ranges: string[]) {
    this.state.rules.dataBar.rangeValues = ranges[0];
  }
}
