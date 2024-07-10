import { Component } from "@odoo/owl";
import {
  ComponentsImportance,
  DEFAULT_FONT,
  SELECTION_BORDER_COLOR,
  SEPARATOR_COLOR,
  TOPBAR_TOOLBAR_HEIGHT,
} from "../../../constants";
import { Store, useStore } from "../../../store_engine";
import {
  CSSProperties,
  ComposerFocusType,
  DOMDimension,
  SpreadsheetChildEnv,
} from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { ComposerSelection } from "../composer/abstract_composer_store";
import { CellComposerStore } from "../composer/cell_composer_store";
import { CellComposer } from "../composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer_focus_store";

const COMPOSER_MAX_HEIGHT = 100;

/* svg free of use from https://uxwing.com/formula-fx-icon/ */
const FX_SVG = /*xml*/ `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 121.8 122.9' width='16' height='16' focusable='false'>
  <path d='m28 34-4 5v2h10l-6 40c-4 22-6 28-7 30-2 2-3 3-5 3-3 0-7-2-9-4H4c-2 2-4 4-4 7s4 6 8 6 9-2 15-8c8-7 13-17 18-39l7-35 13-1 3-6H49c4-23 7-27 11-27 2 0 5 2 8 6h4c1-1 4-4 4-7 0-2-3-6-9-6-5 0-13 4-20 10-6 7-9 14-11 24h-8zm41 16c4-5 7-7 8-7s2 1 5 9l3 12c-7 11-12 17-16 17l-3-1-2-1c-3 0-6 3-6 7s3 7 7 7c6 0 12-6 22-23l3 10c3 9 6 13 10 13 5 0 11-4 18-15l-3-4c-4 6-7 8-8 8-2 0-4-3-6-10l-5-15 8-10 6-4 3 1 3 2c2 0 6-3 6-7s-2-7-6-7c-6 0-11 5-21 20l-2-6c-3-9-5-14-9-14-5 0-12 6-18 15l3 3z' fill='#BDBDBD'/>
</svg>
`;

css/* scss */ `
  .o-topbar-composer {
    height: fit-content;
    margin-top: -1px;
    border: 1px solid;
    z-index: ${ComponentsImportance.TopBarComposer};
    font-family: ${DEFAULT_FONT};

    .o-composer:empty:not(:focus):not(.active)::before {
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
  static components = { CellComposer };

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
    });
  }

  get delimitation(): DOMDimension {
    const { width, height } = this.env.model.getters.getSheetViewDimensionWithHeaders();
    return {
      width,
      height,
    };
  }

  onFocus(selection: ComposerSelection) {
    this.composerFocusStore.focusComposer(this.composerInterface, { selection });
  }
}
