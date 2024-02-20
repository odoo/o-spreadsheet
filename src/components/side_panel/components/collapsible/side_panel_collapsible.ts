import { Component } from "@odoo/owl";
import { css } from "../../../helpers";

const ANGLE_DOWN = /*xml*/ `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
    <!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
    <path d="M201.4 342.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 274.7 86.6 137.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
</svg>
`;

css/* scss */ `
  .o_side_panel_collapsible_title {
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;

    .collapsor:before {
      transform: rotate(-90deg);
      content: url("data:image/svg+xml,${encodeURIComponent(ANGLE_DOWN)}");
      width: 12px;
      display: inline-block;
      margin: 0 2px;
      height: 22px;
    }
    .collapsor:not(.collapsed):before {
      transition: transform 0.2s ease-in-out;
      transform: rotate(0);
    }
  }
`;

export class SidePanelCollapsible extends Component {
  static template = "o-spreadsheet-SidePanelCollapsible";
  static props = {
    slots: Object,
    collapsedAtInit: { type: Boolean, optional: true },
    name: String,
  };
}
