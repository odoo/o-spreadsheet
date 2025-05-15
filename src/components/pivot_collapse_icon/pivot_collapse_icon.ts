import { Component } from "@odoo/owl";
import { deepEquals } from "../../helpers";
import { CellPosition, SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers";

css/* scss */ `
  .o-spreadsheet {
    .o-pivot-collapse-icon {
      cursor: pointer;
      width: 11px;
      height: 11px;
      border: 1px solid #777;
      background-color: #eee;
      margin: 3px 0 3px 6px;

      .o-icon {
        width: 5px;
        height: 5px;
      }
    }
  }
`;

interface Props {
  cellPosition: CellPosition;
}

export class PivotCollapseIcon extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotCollapseIcon";
  static props = {
    cellPosition: Object,
  };

  onClick() {
    const pivotCell = this.env.model.getters.getPivotCellFromPosition(this.props.cellPosition);
    const pivotId = this.env.model.getters.getPivotIdFromPosition(this.props.cellPosition);
    if (!pivotId || pivotCell.type !== "HEADER") {
      return;
    }
    const definition = this.env.model.getters.getPivotCoreDefinition(pivotId);

    const collapsedDomains = definition.collapsedDomains?.[pivotCell.dimension]
      ? [...definition.collapsedDomains[pivotCell.dimension]]
      : [];
    const index = collapsedDomains.findIndex((domain) => deepEquals(domain, pivotCell.domain));
    if (index !== -1) {
      collapsedDomains.splice(index, 1);
    } else {
      collapsedDomains.push(pivotCell.domain);
    }

    const newDomains = definition.collapsedDomains
      ? { ...definition.collapsedDomains }
      : { COL: [], ROW: [] };
    newDomains[pivotCell.dimension] = collapsedDomains;
    this.env.model.dispatch("UPDATE_PIVOT", {
      pivotId,
      pivot: { ...definition, collapsedDomains: newDomains },
    });
  }

  get isCollapsed() {
    const pivotCell = this.env.model.getters.getPivotCellFromPosition(this.props.cellPosition);
    const pivotId = this.env.model.getters.getPivotIdFromPosition(this.props.cellPosition);
    if (!pivotId || pivotCell.type !== "HEADER") {
      return false;
    }
    const definition = this.env.model.getters.getPivotCoreDefinition(pivotId);
    const domains = definition.collapsedDomains?.[pivotCell.dimension] ?? [];
    return domains?.some((domain) => deepEquals(domain, pivotCell.domain));
  }
}
