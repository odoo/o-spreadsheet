import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { canonicalizeContent } from "../../../../../helpers/locale";
import { dataValidationEvaluatorRegistry } from "../../../../../registries/data_validation_registry";
import { _t } from "../../../../../translation";
import { DataValidationCriterionType, SpreadsheetChildEnv } from "../../../../../types";
import { StandaloneComposer } from "../../../../composer/standalone_composer/standalone_composer";
import { css } from "../../../../helpers";

interface Props {
  value: string;
  criterionType: DataValidationCriterionType;
  onValueChanged: (value: string) => void;
  onKeyDown?: (ev: KeyboardEvent) => void;
  focused: boolean;
  onBlur: () => void;
}

css/* scss */ `
  .o-dv-input {
    .o-invalid {
      background-color: #ffdddd;
    }
    .error-icon {
      right: 7px;
      top: 7px;
    }
  }
`;

export class DataValidationInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationInput";
  static props = {
    value: { type: String, optional: true },
    criterionType: String,
    onValueChanged: Function,
    onKeyDown: { type: Function, optional: true },
    focused: { type: Boolean, optional: true },
    onBlur: { type: Function, optional: true },
    onFocus: { type: Function, optional: true },
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
        if (this.props.focused) {
          this.inputRef.el!.focus();
        }
      },
      () => [this.props.focused, this.inputRef.el]
    );
  }

  state = useState({
    shouldDisplayError: !!this.props.value, // Don't display error if user inputted nothing yet
  });

  get placeholder(): string {
    const evaluator = dataValidationEvaluatorRegistry.get(this.props.criterionType);

    if (evaluator.allowedValues === "onlyFormulas") {
      return _t("Formula");
    } else if (evaluator.allowedValues === "onlyLiterals") {
      return _t("Value");
    }

    return _t("Value or formula");
  }

  get allowedValues(): string {
    const evaluator = dataValidationEvaluatorRegistry.get(this.props.criterionType);
    return evaluator.allowedValues ?? "any";
  }

  onInputValueChanged(ev: Event) {
    this.state.shouldDisplayError = true;
    this.props.onValueChanged((ev.target as HTMLInputElement).value);
  }

  onChangeComposerValue(str: string) {
    this.state.shouldDisplayError = true;
    this.props.onValueChanged(str);
  }

  getDataValidationRuleInputComposerProps(): StandaloneComposer["props"] {
    return {
      onConfirm: (str: string) => this.onChangeComposerValue(str),
      composerContent: this.props.value,
      placeholder: this.placeholder,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.env.model.getters.getActiveSheetId(),
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
