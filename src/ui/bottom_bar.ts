import * as owl from "@odoo/owl";
import { Model } from "../model";
import { BACKGROUND_GRAY_COLOR, HEADER_WIDTH, BOTTOMBAR_HEIGHT } from "../constants";
import { PLUS } from "./icons";
const { Component } = owl;
const { xml, css } = owl.tags;

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet-bottom-bar">
    <span class="o-add-sheet" t-on-click="addSheet">${PLUS}</span>
    <t t-foreach="model.state.sheets" t-as="sheet" t-key="sheet">
      <span class="o-sheet" t-on-click="activateSheet(sheet)" t-att-class="{active: sheet === model.state.activeSheet}"><t t-esc="sheet"/></span>
    </t>
    <t t-if="model.state.aggregate !== null">
      <span class="o-space"/>
      <span class="o-aggregate">Sum: <t t-esc="model.state.aggregate"/></span>
    </t>
  </div>`;

const CSS = css/* scss */ `
  .o-spreadsheet-bottom-bar {
    background-color: ${BACKGROUND_GRAY_COLOR};
    padding-left: ${HEADER_WIDTH}px;
    display: flex;
    align-items: center;
    font-size: 15px;

    .o-space {
      flex-grow: 1;
    }

    .o-add-sheet,
    .o-sheet {
      padding: 5px;
      display: inline-block;
      cursor: pointer;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
    .o-add-sheet {
      margin-right: 5px;
    }

    .o-sheet {
      color: #666;
      padding: 0 15px;
      height: ${BOTTOMBAR_HEIGHT}px;
      line-height: ${BOTTOMBAR_HEIGHT}px;

      &.active {
        color: #484;
        background-color: white;
        box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
      }
    }

    .o-aggregate {
      background-color: white;
      font-size: 14px;
      margin-right: 20px;
      padding: 4px 8px;
      color: #333;
      border-radius: 3px;
      box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
    }
    .fade-enter-active {
      transition: opacity 0.5s;
    }

    .fade-enter {
      opacity: 0;
    }
  }
`;

export class BottomBar extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;

  model: Model = this.props.model;

  addSheet() {
    this.model.dispatch({ type: "CREATE_SHEET" });
  }

  activateSheet(name: string) {
    this.model.dispatch({ type: "ACTIVATE_SHEET", sheet: name });
  }
}
