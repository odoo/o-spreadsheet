import { _t } from "@odoo/o-spreadsheet-engine";
import { measureDisplayTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { PIVOT_TOKEN_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { CompiledFormula } from "@odoo/o-spreadsheet-engine/formulas/compiler";
import { Token } from "@odoo/o-spreadsheet-engine/formulas/tokenizer";
import { getFieldDisplayName } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_helpers";
import { PivotRuntimeDefinition } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_runtime_definition";
import { Component } from "@odoo/owl";
import { unquote } from "../../../../../helpers";
import { createMeasureAutoComplete } from "../../../../../registries/auto_completes/pivot_dimension_auto_complete";
import { Color, PivotMeasure, ValueAndLabel } from "../../../../../types";
import { StandaloneComposer } from "../../../../composer/standalone_composer/standalone_composer";
import { Select } from "../../../../select/select";
import { PivotDimension } from "../pivot_dimension/pivot_dimension";

interface Props {
  pivotId: string;
  definition: PivotRuntimeDefinition;
  measure: PivotMeasure;
  onMeasureUpdated: (measure: PivotMeasure) => void;
  onRemoved: () => void;
  generateMeasureId: (fieldName: string, aggregator?: string) => string;
  aggregators;
}

export class PivotMeasureEditor extends Component<Props> {
  static template = "o-spreadsheet-PivotMeasureEditor";
  static components = {
    PivotDimension,
    StandaloneComposer,
    Select,
  };
  static props = {
    definition: Object,
    measure: Object,
    onMeasureUpdated: Function,
    onRemoved: Function,
    generateMeasureId: Function,
    aggregators: Object,
    pivotId: String,
  };

  getMeasureAutocomplete() {
    return createMeasureAutoComplete(this.props.definition, this.props.measure);
  }

  updateMeasureFormula(formula: string) {
    this.props.onMeasureUpdated({
      ...this.props.measure,
      computedBy: {
        sheetId: this.env.model.getters.getActiveSheetId(),
        formula: formula[0] === "=" ? formula : "=" + formula,
      },
    });
  }

  updateAggregator(aggregator: string) {
    this.props.onMeasureUpdated({
      ...this.props.measure,
      aggregator,
      id: this.props.generateMeasureId(this.props.measure.fieldName, aggregator),
    });
  }

  updateName(measure: PivotMeasure, userDefinedName?: string) {
    if (this.props.measure.computedBy && userDefinedName) {
      this.props.onMeasureUpdated({
        ...this.props.measure,
        userDefinedName,
        id: this.props.generateMeasureId(userDefinedName, this.props.measure.aggregator),
        fieldName: userDefinedName,
      });
    } else {
      this.props.onMeasureUpdated({
        ...this.props.measure,
        userDefinedName,
      });
    }
  }

  toggleMeasureVisibility() {
    this.props.onMeasureUpdated({
      ...this.props.measure,
      isHidden: !this.props.measure.isHidden,
    });
  }

  openShowValuesAs() {
    this.env.replaceSidePanel("PivotMeasureDisplayPanel", `pivot_key_${this.props.pivotId}`, {
      pivotId: this.props.pivotId,
      measure: this.props.measure,
    });
  }

  getColoredSymbolToken(token: Token): Color | undefined {
    if (token.type !== "SYMBOL") {
      return undefined;
    }
    const tokenValue = unquote(token.value, "'");
    if (
      this.props.definition.columns.some((col) => col.nameWithGranularity === tokenValue) ||
      this.props.definition.rows.some((row) => row.nameWithGranularity === tokenValue) ||
      this.props.definition.measures.some(
        (measure) => measure.id === tokenValue && measure.id !== this.props.measure.id
      )
    ) {
      return PIVOT_TOKEN_COLOR;
    }
    return undefined;
  }

  get isCalculatedMeasureInvalid(): boolean {
    return CompiledFormula.IsBadExpression(this.props.measure.computedBy?.formula ?? "");
  }

  get aggregatorOptions(): ValueAndLabel[] {
    const aggregators = this.props.aggregators[this.props.measure.type];
    const options = Object.keys(aggregators).map((key) => ({
      value: key,
      label: aggregators[key],
    }));
    if (this.props.measure.computedBy) {
      return [...options, { value: "", label: _t("Compute from totals") }];
    }
    return options;
  }

  getMeasureDescription(measure: PivotMeasure) {
    const measureDisplay = measure.display;
    if (!measureDisplay || measureDisplay.type === "no_calculations") {
      return "";
    }
    const pivot = this.env.model.getters.getPivot(this.props.pivotId);
    const field = [...pivot.definition.columns, ...pivot.definition.rows].find(
      (f) => f.nameWithGranularity === measureDisplay.fieldNameWithGranularity
    );
    const fieldName = field ? getFieldDisplayName(field) : "";
    const value = measureDisplay.value?.toString() || "";
    return measureDisplayTerms.descriptions[measureDisplay.type](fieldName, value);
  }
}
