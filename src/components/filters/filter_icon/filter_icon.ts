import { Component } from "@odoo/owl";
import { FILTERS_COLOR, FILTER_ICON_EDGE_LENGTH } from "../../../constants";
import { DOMCoordinates, SpreadsheetEnv } from "../../../types";
import { css } from "../../helpers/css";

const CSS = css/* scss */ `
  .o-filter-icon {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${FILTER_ICON_EDGE_LENGTH}px;
    height: ${FILTER_ICON_EDGE_LENGTH}px;
    color: #4a4f59;
  }
  .o-filter-icon:hover {
    background: ${FILTERS_COLOR};
    color: #fff;
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

FilterIcon.props = {
  position: Object,
  isActive: Boolean,
  onClick: Function,
};
