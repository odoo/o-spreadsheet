import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { COMPOSER_ASSISTANT_COLOR } from "../../../constants";
import { fuzzyLookup } from "../../../helpers";
import { AutoCompleteProposal, AutoCompleteProvider } from "../../../registries/auto_completes";
import { Store, useLocalStore } from "../../../store_engine";
import { CellValue, SpreadsheetChildEnv, ValueAndLabel } from "../../../types";
import { TextValueProvider } from "../../composer/autocomplete_dropdown/autocomplete_dropdown";
import { AutoCompleteStore } from "../../composer/autocomplete_dropdown/autocomplete_dropdown_store";
import { useAutofocus } from "../../helpers/autofocus_hook";
import { getHtmlContentFromPattern } from "../../helpers/html_content_helpers";
import { Popover } from "../../popover";

interface Props {
  onValuePicked: (value: CellValue) => void;
  values: ValueAndLabel[];
}

export class AutocompletePopover extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-AutocompletePopover";
  static components = { Popover, TextValueProvider };
  static props = {
    onValuePicked: Function,
    values: Array,
    slots: { type: Object, optional: true },
  };

  private buttonRef = useRef("button");
  private popover = useState({ isOpen: false });
  private search = useState({ input: "" });
  private autoComplete!: Store<AutoCompleteStore>;

  setup() {
    this.autoComplete = useLocalStore(AutoCompleteStore);
    this.autoComplete.useProvider(this.getProvider());
    useExternalListener(window, "click", (ev) => {
      if (!this.buttonRef.el?.contains(ev.target as HTMLElement)) {
        this.popover.isOpen = false;
      }
    });
    useAutofocus({ refName: "autofocus" });
  }

  getProvider(): AutoCompleteProvider {
    return {
      proposals: this.proposals,
      autoSelectFirstProposal: false,
      selectProposal: (label) => {
        const value = this.props.values.find((val) => val.label === label);
        if (value) {
          this.pickField(value.value);
        }
      },
    };
  }

  get proposals(): AutoCompleteProposal[] {
    let values = this.props.values;
    if (this.search.input) {
      values = fuzzyLookup(this.search.input, this.props.values, (val) => val.label);
    }
    return values.map((value) => {
      const text = value.label;
      return {
        text,
        fuzzySearchKey: text,
        htmlContent: getHtmlContentFromPattern(
          this.search.input,
          text,
          COMPOSER_ASSISTANT_COLOR,
          "o-semi-bold"
        ),
      };
    });
  }

  get popoverProps() {
    const { x, y, width, height } = this.buttonRef.el!.getBoundingClientRect();
    return {
      anchorRect: { x, y, width, height },
      positioning: "bottom-left",
    };
  }

  updateSearch(searchInput: string) {
    this.search.input = searchInput;
    this.autoComplete.useProvider(this.getProvider());
  }

  pickField(value: CellValue) {
    this.props.onValuePicked(value);
    this.togglePopover();
  }

  togglePopover() {
    this.popover.isOpen = !this.popover.isOpen;
    this.search.input = "";
    this.autoComplete.useProvider(this.getProvider());
  }

  onKeyDown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        const proposals = this.autoComplete.provider?.proposals;
        if (proposals?.length === 1) {
          this.autoComplete.provider?.selectProposal(proposals[0].text || "");
        }
        const proposal = this.autoComplete.selectedProposal;
        this.autoComplete.provider?.selectProposal(proposal?.text || "");
        break;
      case "ArrowUp":
      case "ArrowDown":
        this.autoComplete.moveSelection(ev.key === "ArrowDown" ? "next" : "previous");
        break;
      case "Escape":
        this.popover.isOpen = false;
        break;
      default:
        break;
    }
  }
}
