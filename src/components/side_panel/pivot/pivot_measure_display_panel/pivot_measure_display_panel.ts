import { useProps } from "@odoo/owl";
import { provideAndUsePlugin } from "../../../../helpers/owl3_helpers";
import { useStore } from "../../../../store_engine/store_hooks";
import { ValueAndLabel } from "../../../../types/misc";
import { Store } from "../../../../types/store_engine";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { measureDisplayTerms } from "../../../translations_terms";
import { Checkbox } from "../../components/checkbox/checkbox";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { Section } from "../../components/section/section";
import { SidePanelStore } from "../../side_panel/side_panel_store";
import { PivotMeasureDisplayPanelPlugin } from "./pivot_measure_display_panel_plugin";

export class PivotMeasureDisplayPanel extends OSComponent {
  static template = "o-spreadsheet-PivotMeasureDisplayPanel";
  protected props = useProps({
    onCloseSidePanel: types.function(),
    pivotId: types.UID(),
    measure: types.PivotCoreMeasure(),
  });
  static components = { Section, Checkbox, RadioSelection, Select };

  measureDisplayTypeLabels = measureDisplayTerms.labels;
  measureDisplayDescription = measureDisplayTerms.documentation;

  private sidePanelStore!: Store<SidePanelStore>;

  pivotMeasureDisplayPanelPlugin = provideAndUsePlugin(PivotMeasureDisplayPanelPlugin, {
    pivotId: this.props.pivotId,
    initialMeasure: this.props.measure,
  });

  setup() {
    this.sidePanelStore = useStore(SidePanelStore);
  }

  onSave() {
    this.sidePanelStore.replace(
      "PivotSidePanel",
      `pivot_measure_display_${this.props.pivotId}_${this.props.measure.id}`,
      {
        pivotId: this.props.pivotId,
      }
    );
  }

  onCancel() {
    this.pivotMeasureDisplayPanelPlugin.cancelMeasureDisplayEdition();
    this.sidePanelStore.replace(
      "PivotSidePanel",
      `pivot_measure_display_${this.props.pivotId}_${this.props.measure.id}`,
      {
        pivotId: this.props.pivotId,
      }
    );
  }

  get fieldChoices() {
    return this.pivotMeasureDisplayPanelPlugin.fields().map((field) => ({
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
