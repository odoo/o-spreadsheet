import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../..";
import { GRAY_100, GRAY_300, PRIMARY_BUTTON_BG } from "../../../../../constants";
import { formatValue } from "../../../../../helpers";
import {
  getFieldDisplayName,
  isSortedColumnValid,
} from "../../../../../helpers/pivot/pivot_helpers";
import { PivotRuntimeDefinition } from "../../../../../helpers/pivot/pivot_runtime_definition";
import { _t } from "../../../../../translation";
import { PivotDomain, UID } from "../../../../../types";
import { css } from "../../../../helpers";
import { Section } from "../../../components/section/section";

interface Props {
  definition: PivotRuntimeDefinition;
  pivotId: UID;
}

css/* scss */ `
  .o-pivot-sort {
    .o-sort-card {
      width: fit-content;
      background-color: ${GRAY_100};
      border: 1px solid ${GRAY_300};

      .o-sort-value {
        color: ${PRIMARY_BUTTON_BG};
      }
    }
  }
`;

export class PivotSortSection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotSortSection";
  static components = {
    Section,
  };
  static props = {
    definition: Object,
    pivotId: String,
  };

  get hasValidSort() {
    const pivot = this.env.model.getters.getPivot(this.props.pivotId);
    return (
      !!this.props.definition.sortedColumn &&
      isSortedColumnValid(this.props.definition.sortedColumn, pivot)
    );
  }

  get sortDescription() {
    const sortOrder =
      this.props.definition.sortedColumn?.order === "asc" ? _t("ascending") : _t("descending");
    return _t("Sorted on column (%(ascOrDesc)s):", {
      ascOrDesc: sortOrder,
    });
  }

  get sortValuesAndFields() {
    const sortedColumn = this.props.definition.sortedColumn;
    if (!sortedColumn) {
      return [];
    }
    const pivot = this.env.model.getters.getPivot(this.props.pivotId);
    const locale = this.env.model.getters.getLocale();

    const currentDomain: PivotDomain = [];
    const sortValues: { field?: string; value: string }[] = [];
    for (const domainItem of sortedColumn.domain) {
      currentDomain.push(domainItem);
      const { value, format } = pivot.getPivotHeaderValueAndFormat(currentDomain);
      const label = formatValue(value, { format, locale });
      const field = pivot.definition.getDimension(domainItem.field);
      sortValues.push({ field: getFieldDisplayName(field), value: label });
    }

    if (sortedColumn.domain.length === 0) {
      sortValues.push({ value: _t("Total") });
    }
    const measureLabel = pivot.getMeasure(sortedColumn.measure).displayName;
    sortValues.push({ value: measureLabel, field: _t("Measure") });

    return sortValues;
  }
}
