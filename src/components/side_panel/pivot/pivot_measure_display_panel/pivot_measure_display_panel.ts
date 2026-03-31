import { Component } from "@odoo/owl";
import { PivotCoreMeasure, UID, ValueAndLabel } from "../../../..";
import { Store, useLocalStore } from "../../../../store_engine";
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Select } from "../../../select/select";
import { measureDisplayTerms } from "../../../translations_terms";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
=======
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { measureDisplayTerms } from "../../../translations_terms";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import { Checkbox } from "../../components/checkbox/checkbox";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { Section } from "../../components/section/section";
import { PivotMeasureDisplayPanelStore } from "./pivot_measure_display_panel_store";

interface Props {
  onCloseSidePanel: () => void;
  pivotId: UID;
  measure: PivotCoreMeasure;
}

export class PivotMeasureDisplayPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotMeasureDisplayPanel";
  static props = {
    onCloseSidePanel: Function,
    pivotId: String,
    measure: Object,
  };
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
