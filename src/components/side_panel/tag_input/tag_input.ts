import { Component, useRef, useState } from "@odoo/owl";
import { AutoCompleteProvider } from "../../../registries/auto_completes";
import { Store, useLocalStore } from "../../../store_engine";
import { CellValue, SpreadsheetChildEnv, ValueWithLabel } from "../../../types";
import { TextValueProvider } from "../../composer/autocomplete_dropdown/autocomplete_dropdown";
import { AutoCompleteStore } from "../../composer/autocomplete_dropdown/autocomplete_dropdown_store";
import { getRefBoundingRect } from "../../helpers/dom_helpers";
import { Popover } from "../../popover";
import { Section } from "../components/section/section";

interface Props {
  selectedValues: ValueWithLabel<CellValue>[];
  allValues: ValueWithLabel<CellValue>[];
  onValuesChanged: (values: CellValue[]) => void;
}

export class TagInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TagInput";
  static props = {
    selectedValues: Array,
    allValues: Array,
    onValuesChanged: Function,
  };

  static components = { Section, TextValueProvider, Popover };

  popover = useState({ isOpen: false });

  provider: AutoCompleteProvider | undefined;
  private autoComplete!: Store<AutoCompleteStore>;
  private inputRef = useRef("input");

  setup() {
    this.autoComplete = useLocalStore(AutoCompleteStore);
  }

  useProvider(provider: AutoCompleteProvider) {
    this.provider = provider;
  }

  getProvider(): AutoCompleteProvider {
    const selectedValuesSet = new Set(this.props.selectedValues.map((v) => v.value));
    const proposals = this.props.allValues
      .filter((value) => !selectedValuesSet.has(value.value))
      .map((value) => ({ text: value.label, id: value.value }));
    // ADRM TODO: keyboard navigation ?
    return {
      proposals,
      autoSelectFirstProposal: true,
      selectProposal: (value) => {
        this.popover.isOpen = false;
        this.props.onValuesChanged([...this.props.selectedValues.map((v) => v.value), value]);
      },
    };
  }

  get tags() {
    return this.props.selectedValues.map((value) => ({
      id: value.value,
      text: value.label,
      onDelete: () => {
        this.props.onValuesChanged(
          this.props.selectedValues.filter((v) => v.value !== value.value).map((v) => v.value)
        );
      },
    }));
  }

  get popoverProps() {
    return {
      anchorRect: getRefBoundingRect(this.inputRef),
      positioning: "bottom-left",
    };
  }

  onInputFocus() {
    this.popover.isOpen = true;
    this.autoComplete.useProvider(this.getProvider());
  }

  onInputBlur() {
    // ADRM TODO
    // this.popover.isOpen = false;
  }
}
