import * as owl from "@odoo/owl";
import { functionRegistry } from "../../functions/index";
import { Registry } from "../../registry";

const Component = owl.Component;
const { useState } = owl;
const { xml, css } = owl.tags;
const functions = functionRegistry.content;

// -----------------------------------------------------------------------------
// Autocomplete Value Providers
// -----------------------------------------------------------------------------

interface AutocompleteValue {
  text: string;
  description: string;
}

type AutocompleteProvider = () => Promise<AutocompleteValue[]>;

const providerRegistry = new Registry<AutocompleteProvider>();

providerRegistry.add("functions", async function () {
  return Object.keys(functions).map((key) => {
    return {
      text: key,
      description: functions[key].description,
    };
  });
});

// -----------------------------------------------------------------------------
// Autocomplete DropDown component
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div t-att-class="{'o-autocomplete-dropdown':state.values.length}" >
    <t t-foreach="state.values" t-as="v" t-key="v.text">
        <div t-att-class="{'o-autocomplete-value-focus': state.selectedIndex === v_index}" t-on-click.stop.prevent="fillValue(v_index)">
             <div class="o-autocomplete-value" t-esc="v.text"/>
             <div class="o-autocomplete-description" t-esc="v.description" t-if="state.selectedIndex === v_index"/>
        </div>
    </t>
  </div>`;

const CSS = css/* scss */ `
  .o-autocomplete-dropdown {
    width: 260px;
    margin: 4px;
    background-color: #fff;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);

    & > div:hover {
      background-color: #f2f2f2;
    }
    .o-autocomplete-value-focus {
      background-color: rgba(0, 0, 0, 0.08);
    }

    & > div {
      display: flex;
      flex-direction: column;
      padding: 1px 0 5px 5px;
      .o-autocomplete-description {
        padding: 0 0 0 5px;
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
`;

interface Props {
  provider: string;
  filter?: (searchTerm: string, vals: AutocompleteValue[]) => AutocompleteValue[];
  search: string;
}

export abstract class TextValueProvider extends Component<Props> {
  static template = TEMPLATE;
  static style = CSS;

  state = useState({
    values: <AutocompleteValue[]>[],
    selectedIndex: 0,
  });

  mounted() {
    this.filter(this.props.search);
  }

  willUpdateProps(nextProps: any): Promise<void> {
    if (nextProps.search !== this.props.search) {
      this.filter(nextProps.search);
    }
    return super.willUpdateProps(nextProps);
  }

  async filter(searchTerm: string) {
    const provider = providerRegistry.get(this.props.provider);
    let values = await provider();
    if (this.props.filter) {
      values = this.props.filter(searchTerm, values);
    } else {
      values = values
        .filter((t) => t.text.toUpperCase().startsWith(searchTerm.toUpperCase()))
        .sort((l, r) => (l.text < r.text ? -1 : l.text > r.text ? 1 : 0));
    }
    this.state.values = values.slice(0, 10);
    this.state.selectedIndex = 0;
  }

  fillValue(index) {
    this.state.selectedIndex = index;
    this.trigger("completed", { text: this.getValueToFill() });
  }

  moveDown() {
    this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.values.length;
  }

  moveUp() {
    this.state.selectedIndex--;
    if (this.state.selectedIndex < 0) {
      this.state.selectedIndex = this.state.values.length - 1;
    }
  }

  getValueToFill(): string | void {
    if (this.state.values.length) {
      return this.state.values[this.state.selectedIndex].text;
    }
  }
}
