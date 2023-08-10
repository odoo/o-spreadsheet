import { Component } from "@odoo/owl";
import { FILTERS_COLOR, FILTER_ICON_EDGE_LENGTH } from "../../constants";
import { DOMCoordinates, SpreadsheetEnv } from "../../types";
import { css } from "../helpers/css";

const CSS = css/* scss */ `
  .o-filter-icon {
    color: ${FILTERS_COLOR};
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${FILTER_ICON_EDGE_LENGTH}px;
    height: ${FILTER_ICON_EDGE_LENGTH}px;
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

export class CheckboxIcon extends Component<Props, SpreadsheetEnv> {
  static style = CSS;
  static template = "o-spreadsheet-CheckboxIcon";
  setup(): void {
    console.log("CheckBOx icon pos", this.props.position);
  }
  get style() {
    // console.log(">>>>>>>>>>>> props", this.props);
    const { x, y } = this.props.position;
    return `top:${y}px;left:${x}px`;
  }
}

CheckboxIcon.props = {
  position: Object,
  isActive: Boolean,
  onClick: Function,
};
