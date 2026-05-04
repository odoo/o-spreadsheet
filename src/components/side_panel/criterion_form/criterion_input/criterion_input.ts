import { onWillUpdateProps, props, proxy, signal } from "@odoo/owl";
import { canonicalizeContent, localizeContent } from "../../../../helpers/locale";
import { Component, useLayoutEffect } from "../../../../owl3_compatibility_layer";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import { _t } from "../../../../translation";
import { PropsOf } from "../../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { adaptFormulaToSheet } from "../../../helpers/formula";
import { types } from "../../../props_validation";

export class CriterionInput extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CriterionInput";
  static components = { StandaloneComposer: StandaloneComposer };

  protected props = props({
    sheetId: types.UID(),
    value: types.string().optional(""),
    criterionType: types.DataValidationCriterionType(),
    onValueChanged: types.function<(value: string) => void>(),
    onKeyDown: types.function<(ev: KeyboardEvent) => void>().optional(() => () => {}),
    focused: types.boolean().optional(false),
    onBlur: types.function().optional(() => () => {}),
    onFocus: types.function().optional(),
    disableFormulas: types.boolean().optional(),
  });

  inputRef = signal.ref(HTMLInputElement);

  setup() {
    useLayoutEffect(
      () => {
        const el = this.inputRef();
        if (this.props.focused && el) {
          el.focus();
        }
      },
      () => [this.props.focused, this.inputRef()]
    );
    onWillUpdateProps((nextProps) => {
      if (nextProps.value !== this.props.value) {
        this.state.textInput = localizeContent(nextProps.value, this.env.model.getters.getLocale());
      }
    });
  }

  state = proxy({
    shouldDisplayError: !!this.props.value, // Don't display error if user inputted nothing yet
    textInput: localizeContent(this.props.value, this.env.model.getters.getLocale()),
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
    this.state.textInput = (ev.target as HTMLInputElement).value;
  }

  onInputValueConfirmed() {
    const locale = this.env.model.getters.getLocale();
    const canonicalizedValue = canonicalizeContent(this.state.textInput, locale);
    this.props.onValueChanged(canonicalizedValue);
  }

  onChangeComposerValue(str: string) {
    this.state.shouldDisplayError = true;
    str = adaptFormulaToSheet(this.env.model.getters, str, this.props.sheetId);
    this.props.onValueChanged(str);
  }

  getDataValidationRuleInputComposerProps(): PropsOf<StandaloneComposer> {
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
      canonicalizeContent(this.state.textInput, this.env.model.getters.getLocale())
    );
  }
}
