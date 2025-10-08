import { HIGHLIGHT_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheetChildEnv";
import { Component, useRef } from "@odoo/owl";
import { DataValidationRule, Highlight } from "../../../../types";
import { useHighlightsOnHover } from "../../../helpers/highlight_hook";

interface Props {
  onClick: () => void;
  rule: DataValidationRule;
}

export class DataValidationPreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPreview";
  static props = {
    onClick: Function,
    rule: Object,
  };

  private ref = useRef("dvPreview");

  setup() {
    useHighlightsOnHover(this.ref, this);
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
