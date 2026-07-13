import { useProps } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../../store_engine/store_hooks";
import { ValueAndLabel } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { measureDisplayTerms } from "../../../translations_terms";
import { Checkbox } from "../../components/checkbox/checkbox";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { Section } from "../../components/section/section";
import { PivotMeasureDisplayPanelStore } from "./pivot_measure_display_panel_store";

export class PivotMeasureDisplayPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotMeasureDisplayPanel";
  protected props = useProps({
    onCloseSidePanel: types.function(),
    pivotId: types.UID(),
    measure: types.PivotCoreMeasure(),
  });
  static components = { Section, Checkbox, RadioSelection, Select };

  measureDisplayTypeLabels = measureDisplayTerms.labels;
  measureDisplayDescription = measureDisplayTerms.documentation;

  store!: Store<PivotMeasureDisplayPanelStore>;

  setup() {
    this.store = useLocalStore(
      PivotMeasureDisplayPanelStore,
      this.props.pivotId,
      this.props.measure
    );
  }

  onSave() {
    this.env.replaceSidePanel(
      "PivotSidePanel",
      `pivot_measure_display_${this.props.pivotId}_${this.props.measure.id}`,
      {
        pivotId: this.props.pivotId,
      }
    );
  }

  onCancel() {
    this.store.cancelMeasureDisplayEdition();
    this.env.replaceSidePanel(
      "PivotSidePanel",
      `pivot_measure_display_${this.props.pivotId}_${this.props.measure.id}`,
      {
        pivotId: this.props.pivotId,
      }
    );
  }

  get fieldChoices() {
    return this.store.fields.map((field) => ({
      value: field.nameWithGranularity,
      label: field.displayName,
    }));
  }

  get measureDisplayTypeOptions(): ValueAndLabel[] {
    return Object.keys(this.measureDisplayTypeLabels).map((key) => ({
      value: key,
      label: this.measureDisplayTypeLabels[key],
    }));
  }
}
