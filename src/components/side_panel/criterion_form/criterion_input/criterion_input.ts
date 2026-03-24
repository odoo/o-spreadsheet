import { parseDateTime } from "@odoo/o-spreadsheet-engine/helpers/dates";
import { formatValue } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import { canonicalizeContent } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { DataValidationCriterionType } from "../../../../types";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { DateInput } from "../../../date_input/date_input";
import { CalendarButton } from "../calendar_button/calendar_button";

interface Props {
  value: string;
  criterionType: DataValidationCriterionType;
  onValueChanged: (value: string) => void;
  onKeyDown?: (ev: KeyboardEvent) => void;
  focused: boolean;
  onBlur: () => void;
  disableFormulas?: boolean;
  isDateType?: boolean;
}

export class CriterionInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CriterionInput";
  static props = {
    value: { type: String, optional: true },
    criterionType: String,
    onValueChanged: Function,
    onKeyDown: { type: Function, optional: true },
    focused: { type: Boolean, optional: true },
    onBlur: { type: Function, optional: true },
    onFocus: { type: Function, optional: true },
    disableFormulas: { type: Boolean, optional: true },
    isDateType: { type: Boolean, optional: true },
  };
  static defaultProps = {
    value: "",
    onKeyDown: () => {},
    focused: false,
    onBlur: () => {},
    isDateType: false,
  };
  static components = { DateInput, StandaloneComposer: StandaloneComposer, CalendarButton };

  inputRef = useRef("input");

  setup() {
    useEffect(
      () => {
        if (this.props.focused && this.inputRef.el) {
          this.inputRef.el.focus();
        }
      },
      () => [this.props.focused, this.inputRef.el]
    );
  }

  state = useState({
    shouldDisplayError: !!this.props.value, // Don't display error if user inputted nothing yet
  });

  get placeholder(): string {
    if (this.allowedValues === "onlyFormulas") {
      return _t("Formula");
    } else if (this.allowedValues === "onlyLiterals") {
      return _t("Value");
    }

    return _t("Value or formula");
  }

  get allowedValues(): string {
    const evaluator = criterionEvaluatorRegistry.get(this.props.criterionType);
    if (evaluator.allowedValues === "onlyFormulas" && this.props.disableFormulas) {
      throw new Error(
        `Cannot disable formulas for criterion type ${this.props.criterionType} that accept only formulas`
      );
    }

    const allowedValues = this.props.disableFormulas ? "onlyLiterals" : evaluator.allowedValues;
    return allowedValues ?? "any";
  }

  onDateInputValueChanged(value: string) {
    const locale = this.env.model.getters.getLocale();
    const dateValue = parseDateTime(value, locale);
    if (dateValue) {
      const formatedValue = formatValue(dateValue.value, { format: locale.dateFormat, locale });
      this.onInputValueChanged(formatedValue);
    }
  }

  onInputValueChanged(str: string) {
    this.state.shouldDisplayError = true;
    this.props.onValueChanged(str);
  }

  getDataValidationRuleInputComposerProps(): StandaloneComposer["props"] {
    return {
      onConfirm: (str: string) => this.onInputValueChanged(str),
      composerContent: this.props.value,
      placeholder: this.placeholder,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.env.model.getters.getActiveSheetId(),
      invalid: this.state.shouldDisplayError && !!this.errorMessage,
      defaultStatic: true,
      autofocus: this.props.focused,
    };
  }

  get errorMessage(): string | undefined {
    if (!this.state.shouldDisplayError) {
      return undefined;
    }
    return this.env.model.getters.getDataValidationInvalidCriterionValueMessage(
      this.props.criterionType,
      canonicalizeContent(this.props.value, this.env.model.getters.getLocale())
    );
  }

  shouldDisplayDatePicker() {
    return this.props.isDateType;
  }
}
