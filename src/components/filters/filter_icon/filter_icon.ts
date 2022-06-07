import * as owl from "@odoo/owl";
import { FILTERS_COLOR, ICON_EDGE_LENGTH } from "../../../constants";
import { DOMCoordinates, SpreadsheetEnv } from "../../../types";
import { css } from "../../helpers/css";

const { Component } = owl;

const CSS = css/* scss */ `
  .o-filter-icon {
    color: ${FILTERS_COLOR};
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${ICON_EDGE_LENGTH}px;
    height: ${ICON_EDGE_LENGTH}px;

    svg {
      path {
        fill: ${FILTERS_COLOR};
      }
    }
  }
  .o-filter-icon:hover {
    background: ${FILTERS_COLOR};
    svg {
      path {
        fill: white;
      }
    }
  }
`;

interface Props {
  position: DOMCoordinates;
  isActive: boolean;
  onClick: () => void;
}

export class FilterIcon extends Component<Props, SpreadsheetEnv> {
  static style = CSS;
  static template = "o-spreadsheet-FilterIcon";

  get style() {
    const { x, y } = this.props.position;
    return `top:${y}px;left:${x}px`;
  }
}
