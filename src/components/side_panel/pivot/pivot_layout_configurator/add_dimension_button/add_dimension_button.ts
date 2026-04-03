import { proxy } from "@odoo/owl";
import { COMPOSER_ASSISTANT_COLOR } from "../../../../../constants";
import { fuzzyLookup } from "../../../../../helpers";
import { Component, useExternalListener, useRef } from "../../../../../owl3_compatibility_layer";
import {
  AutoCompleteProposal,
  AutoCompleteProvider,
} from "../../../../../registries/auto_completes";
import { Store, useLocalStore } from "../../../../../store_engine";
import { PivotField } from "../../../../../types/pivot";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { TextValueProvider } from "../../../../composer/autocomplete_dropdown/autocomplete_dropdown";
import { AutoCompleteStore } from "../../../../composer/autocomplete_dropdown/autocomplete_dropdown_store";
import { useAutofocus } from "../../../../helpers/autofocus_hook";
import { getHtmlContentFromPattern } from "../../../../helpers/html_content_helpers";
import { Popover } from "../../../../popover";

interface Props {
  onFieldPicked: (field: string) => void;
  fields: PivotField[];
}

export class AddDimensionButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-AddDimensionButton";
  static components = { Popover, TextValueProvider };
  static props = {
    onFieldPicked: Function,
    fields: Array,
    slots: { type: Object, optional: true },
  };

  private buttonRef = useRef("button");
  private popover = proxy({ isOpen: false });
  private search = proxy({ input: "" });
  private autoComplete!: Store<AutoCompleteStore>;

  // TODO navigation keys. (this looks a lot like auto-complete list. Could maybe be factorized)
  setup() {
    this.autoComplete = useLocalStore(AutoCompleteStore);
    this.autoComplete.useProvider(this.getProvider());
    useExternalListener(window, "click", (ev) => {
      if (ev.target !== this.buttonRef.el) {
        this.popover.isOpen = false;
      }
    });
    useAutofocus({ refName: "autofocus" });
  }

  getProvider(): AutoCompleteProvider {
    return {
      proposals: this.proposals,
      autoSelectFirstProposal: false,
      selectProposal: (proposal) => {
        const field = this.props.fields.find((field) => field.string === proposal.text);
        if (field) {
          this.pickField(field);
        }
      },
    };
  }

  get proposals(): AutoCompleteProposal[] {
    let fields: PivotField[];
    if (this.search.input) {
      fields = fuzzyLookup(this.search.input, this.props.fields, (field) =>
        field.string === field.name ? field.string : field.string + field.name
      );
    } else {
      fields = this.props.fields;
    }
    return fields.map((field) => {
      const text = field.string;
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

  pickField(field: PivotField) {
    this.props.onFieldPicked(field.name);
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
          this.autoComplete.provider?.selectProposal(proposals[0]);
        }
        const proposal = this.autoComplete.selectedProposal;
        if (proposal) {
          this.autoComplete.provider?.selectProposal(proposal);
        }
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
