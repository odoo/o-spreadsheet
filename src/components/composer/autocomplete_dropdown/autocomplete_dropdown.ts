import { Component, onMounted, onWillUpdateProps, useState } from "@odoo/owl";
import { functionRegistry } from "../../../functions/index";
import { Registry } from "../../../registry";
import { css } from "../../helpers/css";
const functions = functionRegistry.content;

// -----------------------------------------------------------------------------
// Autocomplete Value Providers
// -----------------------------------------------------------------------------

interface AutocompleteValue {
  text: string;
  description: string;
}

type AutocompleteProvider = () => AutocompleteValue[];

const providerRegistry = new Registry<AutocompleteProvider>();

providerRegistry.add("functions", () => {
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

css/* scss */ `
  .o-autocomplete-dropdown {
    & > div:hover {
      background-color: #f2f2f2;
    }
  }
`;

interface Props {
  provider: string;
  filter?: (searchTerm: string, vals: AutocompleteValue[]) => AutocompleteValue[];
  search: string;
  borderStyle: string;
  exposeAPI: (api: TextValueProviderApi) => void;
  onCompleted: (text?: string) => void;
}

export interface TextValueProviderApi {
  moveUp: () => void;
  moveDown: () => void;
  getValueToFill: () => string | undefined;
}

export class TextValueProvider extends Component<Props> implements TextValueProviderApi {
  static template = "o-spreadsheet-TextValueProvider";
  state = useState({
    values: <AutocompleteValue[]>[],
    selectedIndex: 0,
  });

  setup() {
    onMounted(() => this.filter(this.props.search));
    onWillUpdateProps((nextProps: Props) => this.checkUpdateProps(nextProps));
    this.props.exposeAPI({
      getValueToFill: () => this.getValueToFill(),
      moveDown: () => this.moveDown(),
      moveUp: () => this.moveUp(),
    });
  }

  checkUpdateProps(nextProps: any) {
    if (nextProps.search !== this.props.search) {
      this.filter(nextProps.search);
    }
  }

  async filter(searchTerm: string) {
    const provider = providerRegistry.get(this.props.provider);
    let values = provider();
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
    this.props.onCompleted(this.getValueToFill());
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

  getValueToFill(): string | undefined {
    if (this.state.values.length) {
      return this.state.values[this.state.selectedIndex].text;
    }
    return undefined;
  }
}
