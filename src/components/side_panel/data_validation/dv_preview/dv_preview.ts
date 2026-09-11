import { signal, useProps } from "@odoo/owl";
import { HIGHLIGHT_COLOR } from "../../../../constants";
import { Component } from "../../../../owl3_compatibility_layer";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import { useStore } from "../../../../store_engine/store_hooks";
import { Highlight } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { useHighlightsOnHover } from "../../../helpers/highlight_hook";
import { types } from "../../../props_validation";
import { SidePanelStore } from "../../side_panel/side_panel_store";

export class DataValidationPreview extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPreview";

  protected props = useProps({
    rule: types.DataValidationRule(),
  });

  private dvPreviewRef = signal.ref();
  private sidePanelStore!: Store<SidePanelStore>;

  setup() {
    this.sidePanelStore = useStore(SidePanelStore);
    useHighlightsOnHover(this.dvPreviewRef, this);
  }

  onPreviewClick() {
    this.sidePanelStore.replace("DataValidationEditor", "DataValidation", {
      ruleId: this.props.rule.id,
    });
  }

  deleteDataValidation() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    this.env.model.dispatch("REMOVE_DATA_VALIDATION_RULE", { sheetId, id: this.props.rule.id });
  }

  get highlights(): Highlight[] {
    return this.props.rule.ranges.map((range) => ({
      range,
      color: HIGHLIGHT_COLOR,
      fillAlpha: 0.06,
    }));
  }

  get rangesString(): string {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.props.rule.ranges
      .map((range) => this.env.model.getters.getRangeString(range, sheetId))
      .join(", ");
  }

  get descriptionString(): string {
    return criterionEvaluatorRegistry
      .get(this.props.rule.criterion.type)
      .getPreview(this.props.rule.criterion, this.env.model.getters);
  }
}
