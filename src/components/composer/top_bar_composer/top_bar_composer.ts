import { Component } from "@odoo/owl";
import { ComponentsImportance, SELECTION_BORDER_COLOR } from "../../../constants";
import { ComposerSelection } from "../../../plugins/ui_stateful/edition";
import { CSSProperties, SpreadsheetChildEnv } from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { Composer } from "../composer/composer";

const COMPOSER_HEIGHT = 34;
const COMPOSER_MAX_HEIGHT = 100;

css/* scss */ `
  .o-topbar-composer {
    height: fit-content;
    background-color: white;
    margin-top: -1px;
    border: 1px solid;
    z-index: ${ComponentsImportance.Composer};
  }
`;

interface Props {
  focus: "inactive" | "cellFocus" | "contentFocus";
  onComposerContentFocused: (selection: ComposerSelection) => void;
}

export class TopBarComposer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBarComposer";
  static components = { Composer };

  get composerStyle(): string {
    const style: CSSProperties = {
      padding: "5px 0px 5px 8px",
      "max-height": `${COMPOSER_MAX_HEIGHT}px`,
      "line-height": "24px",
    };
    style.height = this.props.focus === "inactive" ? `${COMPOSER_HEIGHT}px` : "fit-content";
    return cssPropertiesToCss(style);
  }

  get containerStyle(): string {
    if (this.props.focus === "inactive") {
      return cssPropertiesToCss({
        "border-color": "#e0e2e4",
        "border-right": "none",
      });
    }
    return cssPropertiesToCss({
      "border-color": SELECTION_BORDER_COLOR,
    });
  }
}

TopBarComposer.props = {
  focus: { validate: (value: string) => ["inactive", "cellFocus", "contentFocus"].includes(value) },
  onComposerContentFocused: Function,
};
