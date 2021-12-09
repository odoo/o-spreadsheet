import * as owl from "@odoo/owl";
import { FullMenuItem } from "../../registries";
import { SpreadsheetEnv } from "../../types";
import { GenericWords } from "../side_panel/translations_terms";

const { Component, tags, hooks } = owl;
const { xml, css } = tags;
const { useState } = hooks;

const TEMPLATE = xml/* xml */ `
  <div class="o-filter-menu-item">
    <div class="o-filter-menu-actions">
      <div class="o-filter-menu-action-text" t-on-click="selectAll">Select all</div>
      <div class="o-filter-menu-action-text" t-on-click="clearAll">Clear</div>
    </div>
    <input type="text" t-model="state.textFilter"/>
    <t t-foreach="state.values" t-as="value" t-key="value">
      <div t-if="value.string.startsWith(state.textFilter)" t-on-click="selectVal(value)" class="o-filter-menu-value">
        <div><div class="o-filter-menu-value-checked" t-if="value.checked">✓</div></div>
        <div>
          <t t-if="value.string === ''" t-esc="env._t('${GenericWords.Blanks}')"/>
          <t t-else="" t-esc="value.string"/>
        </div>
      </div>
    </t>
    <div class="o-filter-menu-buttons">
      <div class="o-filter-menu-button" t-on-click="cancel" t-esc="env._t('${GenericWords.Cancel}')"/>
      <div class="o-filter-menu-button" t-on-click="confirm" t-esc="env._t('${GenericWords.Confirm}')"/>

    </div>
  </div>
`;
const CSS = css/* scss */ `
  .o-filter-menu-item {
    box-sizing: border-box;
    padding: 4px 16px;
    display: flex;
    flex-direction: column;

    .o-filter-menu-actions {
      display: flex;
      flex-direction: row;
      margin-bottom: 2px;

      .o-filter-menu-action-text {
        cursor: pointer;
        margin-right: 10px;
        color: blue;
        text-decoration: underline;
      }
    }

    .o-filter-menu-value {
      display: flex;
      flex-direction: row;
      cursor: pointer;

      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }

      div:first-child {
        width: 20px;
        text-align: center;
      }
    }

    .o-filter-menu-buttons {
      display: flex;
      justify-content: flex-end;

      .o-filter-menu-button {
        border: 1px solid lightgrey;
        padding: 4px;
        cursor: pointer;
        border-radius: 4px;
        font-weight: 500;
        line-height: 16px;
        background: white;
        &:hover {
          background-color: rgba(0, 0, 0, 0.08);
        }
      }
      .o-filter-menu-button:last-child {
        margin-left: 10px;
      }
    }
  }
`;

interface Props {
  menuItem: FullMenuItem;
}

interface Value {
  checked: boolean;
  string: string;
}

interface State {
  values: Value[];
  textFilter: string;
}

export class FilterMenuItem extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;

  private state: State;

  constructor(parent: owl.Component<any, SpreadsheetEnv> | null, props: Props) {
    super(parent, props);
    const col = this.env.getters.getActiveFilterCol()!;
    const sheetId = this.env.getters.getActiveSheetId();
    const zone = this.env.getters.getFilterZoneOfCOl(sheetId, col)!;
    const visibleValues = this.env.getters.getFilterZoneValues(zone, true);
    const values = this.env.getters
      .getFilterZoneValues(zone)
      .map((string) => ({ string, checked: visibleValues.includes(string) }));
    this.state = useState({ values, textFilter: "" });
  }

  selectVal(value: Value) {
    value.checked = !value.checked;
  }

  selectAll() {
    this.state.values.map((value) => (value.checked = true));
  }

  clearAll() {
    this.state.values.map((value) => (value.checked = false));
  }

  confirm() {
    const values = this.state.values.filter((val) => val.checked).map((val) => val.string);
    const col = this.env.getters.getActiveFilterCol()!;
    // this.env.dispatch("SET_FILTER_VALUE", { })
    this.env.dispatch("EVALUATE_FILTER", { values, col });
    this.trigger("close");
  }
}
