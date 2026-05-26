import { props, proxy, signal } from "@odoo/owl";
import { canonicalizeContent } from "../../../../helpers/locale";
import { Component, useLayoutEffect } from "../../../../owl3_compatibility_layer";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import { _t } from "../../../../translation";
import { PropsOf } from "../../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { types } from "../../../props_validation";

export class CriterionInput extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CriterionInput";
  static components = { StandaloneComposer: StandaloneComposer };

  protected props = props(
    {
      "value?": types.string(),
      criterionType: types.DataValidationCriterionType(),
      onValueChanged: types.function<[value: string]>([types.string()]),
      "onKeyDown?": types.function<[ev: KeyboardEvent]>([types.instanceOf(KeyboardEvent)]),
      "focused?": types.boolean(),
      "onBlur?": types.function([]),
      "onFocus?": types.function([]),
      "disableFormulas?": types.boolean(),
    },
    {
      value: "",
      onKeyDown: () => {},
      focused: false,
      onBlur: () => {},
    }
  );

  inputRef = signal<HTMLInputElement | null>(null);

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
  }

  state = proxy({
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
    this.props.onValueChanged(str);
  }

  getDataValidationRuleInputComposerProps(): PropsOf<StandaloneComposer> {
    return {
      onConfirm: (str: string) => this.onChangeComposerValue(str),
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
}
