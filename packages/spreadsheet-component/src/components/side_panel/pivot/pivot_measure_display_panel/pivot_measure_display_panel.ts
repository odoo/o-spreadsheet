import { Component } from "@odoo/owl";
import { PivotCoreMeasure, SpreadsheetChildEnv, UID } from "../../../..";
import { GRAY_300 } from "../../../../constants";
import { Store, useLocalStore } from "../../../../store_engine";
import { css } from "../../../helpers";
import { measureDisplayTerms } from "../../../translations_terms";
import { Checkbox } from "../../components/checkbox/checkbox";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { Section } from "../../components/section/section";
import { PivotMeasureDisplayPanelStore } from "./pivot_measure_display_panel_store";

interface Props {
  onCloseSidePanel: () => void;
  pivotId: UID;
  measure: PivotCoreMeasure;
}

css/* scss */ `
  .o-sidePanel {
    .o-pivot-measure-display-field,
    .o-pivot-measure-display-value {
      box-sizing: border-box;
      border: solid 1px ${GRAY_300};
      border-radius: 3px;
    }

    .o-pivot-measure-display-description {
      white-space: pre-wrap;
      color: dimgray;
      border-left: 2px solid ${GRAY_300};
    }
  }
`;

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
    this.env.openSidePanel("PivotSidePanel", { pivotId: this.props.pivotId });
  }

  onCancel() {
    this.store.cancelMeasureDisplayEdition();
    this.env.openSidePanel("PivotSidePanel", { pivotId: this.props.pivotId });
  }

  get fieldChoices() {
    return this.store.fields.map((field) => ({
      value: field.nameWithGranularity,
      label: field.displayName,
    }));
  }
}
