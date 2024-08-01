import { Component } from "@odoo/owl";
import { PivotRuntimeDefinition } from "../../../../../helpers/pivot/pivot_runtime_definition";
import { createMeasureAutoComplete } from "../../../../../registries/auto_completes/pivot_dimension_auto_complete";
import { PivotMeasure } from "../../../../../types";
import { StandaloneComposer } from "../../../../composer/standalone_composer/standalone_composer";
import { PivotDimension } from "../pivot_dimension/pivot_dimension";

interface Props {
  definition: PivotRuntimeDefinition;
  measure: PivotMeasure;
  onMeasureUpdated: (measure: PivotMeasure) => void;
  onRemoved: () => void;
  generateMeasureId: (fieldName: string, aggregator?: string) => string;
}

export class PivotMeasureEditor extends Component<Props> {
  static template = "o-spreadsheet-PivotMeasureEditor";
  static components = {
    PivotDimension,
    StandaloneComposer,
  };
  static props = {
    definition: Object,
    measure: Object,
    onMeasureUpdated: Function,
    onRemoved: Function,
    generateMeasureId: Function,
    aggregators: Object,
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
}
