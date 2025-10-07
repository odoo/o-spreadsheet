import { measureDisplayTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { Component } from "@odoo/owl";
import { PivotCoreMeasure, UID } from "../../../..";
import { Store, useLocalStore } from "../../../../store_engine";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheetChildEnv";
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
  static components = { Section, Checkbox, RadioSelection };

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
}
