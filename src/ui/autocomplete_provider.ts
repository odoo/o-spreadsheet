import * as owl from "@odoo/owl";
import { functions } from "../functions/index";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

interface AutocompleteValue {
  text: string;
  description: string;
}

const TEMPLATE = xml/* xml */ `<div class="o-autocomplete-provider">
    <t t-foreach="state.filtered" t-as="v" t-key="v.text">
        <div t-att-class="{'o-autocomplete-value-focus': state.selectedIndex === v_index}">
             <div class="o-autocomplete-value" t-esc="v.text"/>
             <div class="o-autocomplete-description" t-esc="v.description" t-if="state.selectedIndex === v_index"/>
        </div>
    </t>
</div>`;
const CSS = css/* scss */ `
  .o-autocomplete-provider {
    width: 220px;
    margin: 4px;
    background-color: #fff;

    & > div:hover {
      background-color: #f2f2f2;
    }
    .o-autocomplete-value-focus {
      outline: darkorange dashed 1.5px;
    }

    & > div {
      display: flex;
      flex-direction: column;
      .o-autocomplete-description {
        font-size: 11px;
      }
    }
  }
`;

interface Props {
  getValues: () => Promise<AutocompleteValue[]>;
  filter?: (searchTerm: String) => AutocompleteValue[];
  search: String;
}

export abstract class TextValueProvider extends Component<any, Props> {
  static template = TEMPLATE;
  static style = CSS;

  state = useState({
    values: <AutocompleteValue[]>[],
    selectedIndex: <number>0,
    filtered: <AutocompleteValue[]>[]
  });

  async mounted(): Promise<void> {
    this.state.values = await this.props.getValues();
    this.filter(this.props.search);
  }

  willUpdateProps(nextProps: any): Promise<void> {
    if (nextProps.search !== this.props.search) {
      this.filter(nextProps.search);
    }
    return super.willUpdateProps(nextProps);
  }

  filter(searchTerm: String) {
    if (this.props.filter) {
      this.state.filtered = this.props.filter(searchTerm);
    } else {
      this.state.filtered = this.state.values
        .filter(t => t.text.toUpperCase().startsWith(searchTerm.toUpperCase()))
        .sort((l, r) => (l.text < r.text ? -1 : l.text > r.text ? 1 : 0));
    }
    this.state.selectedIndex = 0;
  }

  moveDown() {
    this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.filtered.length;
  }

  moveUp() {
    this.state.selectedIndex--;
    if (this.state.selectedIndex < 0) {
      this.state.selectedIndex = this.state.filtered.length - 1;
    }
  }

  getValueToFill(): string | void {
    if (this.state.filtered.length) {
      return this.state.filtered[this.state.selectedIndex].text;
    }
    return;
  }
}

export async function getFunctionsProvider(): Promise<AutocompleteValue[]> {
  return Object.keys(functions).map(key => {
    return {
      text: key,
      description: functions[key].description
    };
  });
}
