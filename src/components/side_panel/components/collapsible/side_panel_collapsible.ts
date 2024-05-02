import { Component } from "@odoo/owl";
import { css } from "../../../helpers";

const ANGLE_DOWN = /*xml*/ `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224 256">
    <path d="M201.4 342.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 274.7 86.6 137.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z" transform="translate(0, 9) scale(0.5,0.5)"/>
</svg>
`;

const BACKGROUND_COLOR = "#fdfdfd";
const BORDER_COLOR = "#8b8b8b";

css/* scss */ `
  .o_side_panel_collapsible_title {
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    padding: 6px 0px 6px 6px !important;

    .collapsor:before {
      transform: rotate(-90deg);
      content: url("data:image/svg+xml,${encodeURIComponent(ANGLE_DOWN)}");
      width: 12px;
      display: inline-block;
      margin: 0 5px 0px 2px;
      height: 22px;
      transform-origin: 7px 10px;
      transition: transform 0.2s ease-in-out;
    }
    .collapsor:not(.collapsed):before {
      transform: rotate(0);
    }

    .collapsor:not(.collapsed) {
      background-color: ${BACKGROUND_COLOR};
      border: solid ${BORDER_COLOR} 1px;
      margin: -3px 1px -6px -5px;
      border-radius: 5px 5px 0px 0px;
      border-bottom: 0px;
      transition-delay: 0s;
    }

    .collapsor {
      width: 100%;
      margin: -2px 2px -5px -4px;
      padding: 2px 0 6px 4px;
      background-color: transparent;
      border: solid ${BORDER_COLOR} 0px;
      transition-delay: 0.35s;
      transition-property: all;
    }

    .collapsor.collapsed {
    }
  }

  .collapsible_section {
    background-color: #fff;
    border: solid ${BORDER_COLOR} 1px;
    border-top: 0;
    border-radius: 0 0 5px 5px;
    margin: 0px 1px 0px 1px;

    &.collapsing,
    &.show {
      background-color: ${BACKGROUND_COLOR};
    }

    &.collapsing {
      transition: height 0.35s, background-color 0.35s !important;
    }
  }
`;

let CURRENT_COLLAPSIBLE_ID = 0;

export class SidePanelCollapsible extends Component {
  static template = "o-spreadsheet-SidePanelCollapsible";
  static props = {
    slots: Object,
    collapsedAtInit: { type: Boolean, optional: true },
    class: { type: String, optional: true },
  };

  currentId = (CURRENT_COLLAPSIBLE_ID++).toString();
}
