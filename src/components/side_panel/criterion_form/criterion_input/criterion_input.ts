import { canonicalizeContent } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { DataValidationCriterionType, UID } from "../../../../types";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { adaptFormulaToSheet } from "../../../helpers/formulas";

interface Props {
  value: string;
  criterionType: DataValidationCriterionType;
  sheetId: UID;
  onValueChanged: (value: string) => void;
  onKeyDown?: (ev: KeyboardEvent) => void;
  focused: boolean;
  onBlur: () => void;
  disableFormulas?: boolean;
}

export class CriterionInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CriterionInput";
  static props = {
    value: { type: String, optional: true },
    criterionType: String,
    onValueChanged: Function,
    sheetId: { type: String, optional: true },
    onKeyDown: { type: Function, optional: true },
    focused: { type: Boolean, optional: true },
    onBlur: { type: Function, optional: true },
    onFocus: { type: Function, optional: true },
    disableFormulas: { type: Boolean, optional: true },
  };
  static defaultProps = {
    value: "",
    onKeyDown: () => {},
    focused: false,
    onBlur: () => {},
  };
  static components = { StandaloneComposer: StandaloneComposer };

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

  onInputValueChanged(ev: Event) {
    this.state.shouldDisplayError = true;
    this.props.onValueChanged((ev.target as HTMLInputElement).value);
  }

  onChangeComposerValue(str: string) {
    this.state.shouldDisplayError = true;
    str = adaptFormulaToSheet(this.env.model.getters, str, this.props.sheetId);
    this.props.onValueChanged(str);
  }

  getDataValidationRuleInputComposerProps(): StandaloneComposer["props"] {
    return {
      onConfirm: (str: string) => this.onChangeComposerValue(str),
      composerContent: this.props.value,
      placeholder: this.placeholder,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.props.sheetId,
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
}
