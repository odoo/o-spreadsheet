import { Component } from "@odoo/owl";
import { GRID_ICON_EDGE_LENGTH, TEXT_BODY } from "../../../../constants";
import { deepEquals, relativeLuminance } from "../../../../helpers";
import { domainToColRowDomain } from "../../../../helpers/pivot/pivot_domain_helpers";
import { sortPivotAtPosition } from "../../../../helpers/pivot/pivot_helpers";
import { CellPosition, SortDirection, SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers";

css/* scss */ `
  .o-pivot-sort-icon {
    width: ${GRID_ICON_EDGE_LENGTH}px;
    height: ${GRID_ICON_EDGE_LENGTH}px;

    color: ${TEXT_BODY};
    cursor: pointer;

    &.o-high-contrast {
      color: #fff;
    }

    .o-dash-icon {
      font-size: 30px;
      padding-bottom: 4px;
      font-weight: 300;
    }
  }
`;

interface Props {
  cellPosition: CellPosition;
}
export class PivotSortIcon extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotSortIcon";
  static props = { cellPosition: Object };

  onClick() {
    const pivotCellInfo = this.pivotCellInfo;
    if (!pivotCellInfo) {
      return undefined;
    }
    const { pivot, colDomain, pivotCell } = pivotCellInfo;
    const sortedColumn = pivot.definition.sortedColumn;

    if (
      !deepEquals(sortedColumn?.domain, colDomain) ||
      sortedColumn?.measure !== pivotCell.measure
    ) {
      sortPivotAtPosition(this.env, this.props.cellPosition, "asc");
      return;
    }

    if (sortedColumn?.order === "asc") {
      sortPivotAtPosition(this.env, this.props.cellPosition, "desc");
    } else if (sortedColumn?.order === "desc") {
      sortPivotAtPosition(this.env, this.props.cellPosition, "none");
    } else {
      sortPivotAtPosition(this.env, this.props.cellPosition, "asc");
    }
  }

  get highContrastClass(): string {
    const cellStyle = this.env.model.getters.getCellComputedStyle(this.props.cellPosition);
    const luminance = relativeLuminance(cellStyle.fillColor || "#fff");
    return luminance < 0.45 ? "o-high-contrast" : "";
  }

  get sortDirection(): SortDirection | undefined {
    const pivotCellInfo = this.pivotCellInfo;
    if (!pivotCellInfo) {
      return undefined;
    }
    const { pivot, colDomain, pivotCell } = pivotCellInfo;
    const sortedColumn = pivot.definition.sortedColumn;

    if (sortedColumn?.measure === pivotCell.measure && deepEquals(sortedColumn.domain, colDomain)) {
      return sortedColumn.order;
    }
    return undefined;
  }

  get pivotCellInfo() {
    const position = this.props.cellPosition;
    const pivotId = this.env.model.getters.getPivotIdFromPosition(position);
    const pivotCell = this.env.model.getters.getPivotCellFromPosition(position);
    if (pivotCell.type === "EMPTY" || pivotCell.type === "HEADER" || !pivotId) {
      return undefined;
    }
    const pivot = this.env.model.getters.getPivot(pivotId);
    const colDomain = domainToColRowDomain(pivot, pivotCell.domain).colDomain;

    return { pivot, colDomain, pivotCell };
  }
}
