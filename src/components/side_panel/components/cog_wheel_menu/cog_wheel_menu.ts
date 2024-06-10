import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types/env";
import { css } from "../../../helpers";
import { Popover } from "../../../popover";

interface CogWheelMenuItem {
  name: string;
  icon?: string;
  onClick: () => void;
}

interface Props {
  items: CogWheelMenuItem[];
}

css/* scss */ `
  .os-cog-wheel-menu-icon {
    cursor: pointer;
  }

  .os-cog-wheel-menu {
    background: white;
    .btn-link {
      text-decoration: none;
      color: #017e84;
      font-weight: 500;
      &:hover {
        color: #01585c;
      }
    }
  }
`;

export class CogWheelMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CogWheelMenu";
  static components = { Popover };
  static props = {
    items: Array,
  };

  private buttonRef = useRef("button");
  private popover = useState({ isOpen: false });

  setup() {
    useExternalListener(window, "click", (ev) => {
      if (ev.target !== this.buttonRef.el) {
        this.popover.isOpen = false;
      }
    });
  }

  get popoverProps() {
    const { x, y, width, height } = this.buttonRef.el!.getBoundingClientRect();
    return {
      anchorRect: { x, y, width, height },
      positioning: "BottomLeft",
    };
  }

  togglePopover() {
    this.popover.isOpen = !this.popover.isOpen;
  }
}
