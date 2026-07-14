import { Component } from "@odoo/owl";
import {
  ComponentsImportance,
  DEFAULT_FONT,
  SELECTION_BORDER_COLOR,
  SEPARATOR_COLOR,
  TOPBAR_TOOLBAR_HEIGHT,
} from "../../../constants";
import { Store, useStore } from "../../../store_engine";
import { CSSProperties, ComposerFocusType, SpreadsheetChildEnv } from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { FX_SVG } from "../../icons/raw_svgs";
import { ComposerSelection } from "../composer/abstract_composer_store";
import { CellComposerStore } from "../composer/cell_composer_store";
import { Composer } from "../composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer_focus_store";

const COMPOSER_MAX_HEIGHT = 100;

css/* scss */ `
  .o-topbar-composer {
    height: fit-content;
    margin-top: -1px;
    border: 1px solid;
    font-family: ${DEFAULT_FONT};

    /* In readonly we always show the fx icon if the composer is empty, not matter the focus */
    .o-composer:empty:not(:focus):not(.active)::before,
    &.o-topbar-composer-readonly .o-composer:empty::before {
      content: url("data:image/svg+xml,${encodeURIComponent(FX_SVG)}");
      position: relative;
      top: 20%;
    }
  }

  .user-select-text {
    user-select: text;
  }
`;

export class TopBarComposer extends Component<any, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBarComposer";
  static props = {};
  static components = { Composer };

  private composerFocusStore!: Store<ComposerFocusStore>;
  private composerStore!: Store<CellComposerStore>;
  private composerInterface!: ComposerInterface;

  setup() {
    this.composerFocusStore = useStore(ComposerFocusStore);
    const composerStore = useStore(CellComposerStore);
    this.composerStore = composerStore;
    this.composerInterface = {
      id: "topbarComposer",
      get editionMode() {
        return composerStore.editionMode;
      },
      startEdition: this.composerStore.startEdition,
      setCurrentContent: this.composerStore.setCurrentContent,
      stopEdition: this.composerStore.stopEdition,
    };
  }

  get focus(): ComposerFocusType {
    return this.composerFocusStore.activeComposer === this.composerInterface
      ? this.composerFocusStore.focusMode
      : "inactive";
  }

  get composerStyle(): string {
    const style: CSSProperties = {
      padding: "5px 0px 5px 8px",
      "max-height": `${COMPOSER_MAX_HEIGHT}px`,
      "line-height": "24px",
    };
    style.height = this.focus === "inactive" ? `${TOPBAR_TOOLBAR_HEIGHT}px` : "fit-content";
    return cssPropertiesToCss(style);
  }

  get containerStyle(): string {
    if (this.focus === "inactive") {
      return cssPropertiesToCss({
        "border-color": SEPARATOR_COLOR,
        "border-right": "none",
      });
    }
    return cssPropertiesToCss({
      "border-color": SELECTION_BORDER_COLOR,
      "z-index": String(ComponentsImportance.TopBarComposer),
    });
  }

  onFocus(selection: ComposerSelection) {
    this.composerFocusStore.focusComposer(this.composerInterface, { selection });
  }
}
