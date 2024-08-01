import { Component } from "@odoo/owl";
import { FIGURE_BORDER_COLOR } from "../../../../constants";
import { dataValidationEvaluatorRegistry } from "../../../../registries/data_validation_registry";
import type { DataValidationRule, SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers";

css/* scss */ `
  .o-sidePanel {
    .o-dv-preview {
      height: 70px;
      box-sizing: border-box;
      cursor: pointer;
      border-bottom: 1px solid ${FIGURE_BORDER_COLOR};

      .o-dv-container {
        min-width: 0; // otherwise flex won't shrink correctly
      }

      .o-dv-preview-description {
        font-size: 13px;
      }

      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }

      &:not(:hover) .o-dv-preview-delete {
        display: none !important;
      }
    }
  }
`;
interface Props {
  onClick: () => void;
  rule: DataValidationRule;
}

export class DataValidationPreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPreview";

  deleteDataValidation() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    this.env.model.dispatch("REMOVE_DATA_VALIDATION_RULE", { sheetId, id: this.props.rule.id });
  }

  get rangesString(): string {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.props.rule.ranges
      .map((range) => this.env.model.getters.getRangeString(range, sheetId))
      .join(", ");
  }

  get descriptionString(): string {
    return dataValidationEvaluatorRegistry
      .get(this.props.rule.criterion.type)
      .getPreview(this.props.rule.criterion, this.env.model.getters);
  }
}

DataValidationPreview.props = {
  onClick: Function,
  rule: Object,
};
