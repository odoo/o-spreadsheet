import { props, signal } from "@odoo/owl";
import { HIGHLIGHT_COLOR } from "../../../../constants";
import { Component } from "../../../../owl3_compatibility_layer";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import { Highlight } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { useHighlightsOnHover } from "../../../helpers/highlight_hook";
import { types } from "../../../props_validation";

export class DataValidationPreview extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPreview";

  protected props = props({
    rule: types.DataValidationRule(),
  });

  private dvPreviewRef = signal<HTMLElement | null>(null);

  setup() {
    useHighlightsOnHover(this.dvPreviewRef, this);
  }

  onPreviewClick() {
    this.env.replaceSidePanel("DataValidationEditor", "DataValidation", {
      ruleId: this.props.rule.id,
      sheetId: this.env.model.getters.getActiveSheetId(),
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
