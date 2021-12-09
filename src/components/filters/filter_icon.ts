import * as owl from "@odoo/owl";
import { DEFAULT_FILTER_BORDER_DESC } from "../../constants";
import { DOMCoordinates, SpreadsheetEnv } from "../../types";
import { FILTER_ICON, FILTER_ICON_ACTIVE } from "../icons";

const { Component, tags } = owl;
const { xml, css } = tags;

const XML = xml/* xml */ `
    <div class="o-icon o-filter-icon" t-att-style="style">
      <span t-if="props.isActive" class="o-filter-active-icon">${FILTER_ICON_ACTIVE}</span>
      <span t-else="">${FILTER_ICON}</span>
    </div>
  `;

const CSS = css/* scss */ `
  .o-filter-icon {
    color: ${DEFAULT_FILTER_BORDER_DESC[1]};
    position: absolute;
    svg {
      path {
        fill: ${DEFAULT_FILTER_BORDER_DESC[1]};
      }
    }
    .o-filter-active-icon {
      svg {
        padding: 2px;
      }
    }
  }
  .o-filter-icon:hover {
    background: ${DEFAULT_FILTER_BORDER_DESC[1]};
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
}

export class FilterIcon extends Component<Props, SpreadsheetEnv> {
  static style = CSS;
  static template = XML;

  get style() {
    const { x, y } = this.props.position;
    return `top:${y}px;left:${x}px`;
  }
}
