import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { ComponentsImportance } from "../../constants";
import { Store, useStore } from "../../store_engine";
import { ComposerFocusType, Rect, SpreadsheetChildEnv } from "../../types";
import { Ripple } from "../animation/ripple";
import { BottomBar } from "../bottom_bar/bottom_bar";
import { CellComposerStore } from "../composer/composer/cell_composer_store";
import { CellComposerProps, Composer } from "../composer/composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer/composer_focus_store";
import { css, cssPropertiesToCss } from "../helpers";
import { getBoundingRectAsPOJO, isIOS } from "../helpers/dom_helpers";
import { RibbonMenu } from "./ribbon_menu/ribbon_menu";

interface Props {
  onClick: () => void;
}

css`
  .o-small-composer {
    z-index: ${ComponentsImportance.TopBarComposer};
  }
`;

export class SmallBottomBar extends Component<Props, SpreadsheetChildEnv> {
  static components = { Composer, BottomBar, Ripple, RibbonMenu };
  static template = "o-spreadsheet-SmallBottomBar";
  static props = {
    onClick: Function,
  };

  private composerFocusStore!: Store<ComposerFocusStore>;
  private composerStore!: Store<CellComposerStore>;
  private composerInterface!: ComposerInterface;
  private composerRef = useRef("bottombarComposer");

  private menuState = useState({
    isOpen: false,
  });

  setup(): void {
    this.composerFocusStore = useStore(ComposerFocusStore);
    const composerStore = useStore(CellComposerStore);
    this.composerStore = composerStore;
    this.composerInterface = {
      id: "bottombarComposer",
      get editionMode() {
        return composerStore.editionMode;
      },
      startEdition: this.composerStore.startEdition,
      setCurrentContent: this.composerStore.setCurrentContent,
      stopEdition: this.composerStore.stopEdition,
    };

    useEffect(() => {
      if (
        // we hide the grid composer on mobile so we need to autofocus this composer
        this.env.isMobile() &&
        !this.menuState.isOpen &&
        this.composerStore.editionMode !== "inactive" &&
        this.composerFocusStore.activeComposer !== this.composerInterface
      ) {
        this.composerFocusStore.focusComposer(this.composerInterface, {
          focusMode: "contentFocus",
        });
      }
    });
  }

  get focus(): ComposerFocusType {
    return this.composerFocusStore.activeComposer === this.composerInterface
      ? this.composerFocusStore.focusMode
      : "inactive";
  }

  get rect(): Rect {
    return this.composerRef.el
      ? getBoundingRectAsPOJO(this.composerRef.el)
      : { x: 0, y: 0, width: 0, height: 0 };
  }

  get composerProps(): CellComposerProps {
    const { width, height } = this.env.model.getters.getSheetViewDimensionWithHeaders();
    return {
      rect: { ...this.rect },
      delimitation: {
        width,
        height,
      },
      focus: this.focus,
      composerStore: this.composerStore,
      onComposerContentFocused: (selection) =>
        this.composerFocusStore.focusComposer(this.composerInterface, {
          focusMode: "contentFocus",
          selection,
        }),
      isDefaultFocus: false,
      inputStyle: cssPropertiesToCss({
        height: this.focus === "inactive" ? "26px" : "fit-content",
        "max-height": `130px`,
      }),
      showAssistant: !isIOS(), // Hide assistant on iOS as it breaks visually
    };
  }

  get symbols(): string[] {
    return ["=", "(", ")", ":", "-", "/", "*", ",", "+", "$", "."];
  }

  insertSymbol(symbol: string): void {
    this.composerStore.replaceComposerCursorSelection(symbol);
    this.composerFocusStore.focusComposer(this.composerInterface, {
      focusMode: "contentFocus",
    });
  }

  toggleRibbon(): void {
    this.composerStore.cancelEdition();
    this.menuState.isOpen = !this.menuState.isOpen;
  }
}
