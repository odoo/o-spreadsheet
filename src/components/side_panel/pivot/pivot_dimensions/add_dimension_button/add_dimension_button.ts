import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../..";
import { fuzzyLookup } from "../../../../../helpers";
import { PivotField } from "../../../../../types/pivot";
import { css } from "../../../../helpers";
import { Popover } from "../../../../popover";

interface Props {
  onFieldPicked: (field: string) => void;
  fields: PivotField[];
}

css/* scss */ `
  input.pivot-dimension-search-field:focus {
    outline: none;
  }
  .pivot-dimension-search-field-icon svg {
    width: 13px;
    height: 13px;
  }
  .pivot-dimension-search {
    background-color: white;
  }
  .pivot-dimension-field {
    background-color: white;

    &:hover {
      background-color: #f0f0f0;
    }
  }
`;

export class AddDimensionButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-AddDimensionButton";
  static components = { Popover };
  static props = {
    onFieldPicked: Function,
    fields: Array,
  };

  private buttonRef = useRef("button");
  private popover = useState({ isOpen: false });
  private search = useState({ input: "" });

  // TODO navigation keys. (this looks a lot like auto-complete list. Could maybe be factorized)
  setup() {
    useExternalListener(window, "click", (ev) => {
      if (ev.target !== this.buttonRef.el) {
        this.popover.isOpen = false;
      }
    });
  }

  get filteredFields() {
    if (this.search.input) {
      return fuzzyLookup(this.search.input, this.props.fields, (field) => field.string);
    }
    return this.props.fields;
  }

  get popoverProps() {
    return {
      anchorRect: this.buttonRef.el!.getBoundingClientRect(),
      positioning: "BottomLeft",
    };
  }

  pickField(field: PivotField) {
    this.props.onFieldPicked(field.name);
    this.popover.isOpen = false;
    this.search.input = "";
  }

  togglePopover() {
    this.popover.isOpen = !this.popover.isOpen;
    this.search.input = "";
  }

  onKeyDown(ev: KeyboardEvent) {
    if (this.filteredFields.length === 1 && ev.key === "Enter") {
      this.pickField(this.filteredFields[0]);
    }
  }
}
