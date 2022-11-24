import { Component } from "@odoo/owl";
import { ComponentsImportance, SELECTION_BORDER_COLOR } from "../../../constants";
import { ComposerSelection } from "../../../plugins/ui/edition";
import { SpreadsheetChildEnv } from "../../../types/index";
import { css } from "../../helpers/css";
import { Composer } from "../composer/composer";

const COMPOSER_HEIGHT = 20;

css/* scss */ `
  .o-topbar-composer {
    flex-grow: 1;
    height: fit-content;
    background-color: white;
    margin-top: -1px;
    margin-bottom: -1px;
    border: 1px solid #e0e2e4;
    border-right: none;
    line-height: 20px;
    z-index: ${ComponentsImportance.Composer};
    .o-composer-container {
      .o-composer {
        padding-left: 8px;

        &:focus {
          height: fit-content;
        }
      }
    }

    p:last-child {
      padding-bottom: 7px;
    }
    p:only-child {
      padding-bottom: 0px;
    }
  }
`;

interface Props {
  focus: "inactive" | "cellFocus" | "contentFocus";
  onComposerContentFocused: (selection: ComposerSelection) => void;
}

/**
 * This component is a composer which positions itself on the grid at the anchor cell.
 * It also applies the style of the cell to the composer input.
 */
export class TopBarComposer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBarComposer";
  static components = { Composer };

  setup() {}

  get composerStyle(): string {
    const commonStyle = `
      padding-top: 7px;
      padding-bottom: 7px;
    `;
    if (this.props.focus === "inactive") {
      return (
        commonStyle +
        `
        height: ${COMPOSER_HEIGHT}px;
      `
      );
    }
    return (
      commonStyle +
      `
        height : fit-content;
        max-height: 100px;
    `
    );
  }

  get containerStyle(): string {
    if (this.props.focus === "inactive") {
      return `
      `;
    }
    return `border: 1px solid ${SELECTION_BORDER_COLOR};
    `;
  }
}

TopBarComposer.props = {
  focus: { validate: (value: string) => ["inactive", "cellFocus", "contentFocus"].includes(value) },
  onComposerContentFocused: Function,
};
