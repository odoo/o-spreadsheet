import { Component, useRef, useState } from "@odoo/owl";
import { Store, useStore } from "../../store_engine";
import { ComposerFocusType, Rect, SpreadsheetChildEnv } from "../../types";
import { Ripple } from "../animation/ripple";
import { BottomBar } from "../bottom_bar/bottom_bar";
import { CellComposerStore } from "../composer/composer/cell_composer_store";
import { CellComposerProps, Composer } from "../composer/composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer/composer_focus_store";
import { cssPropertiesToCss } from "../helpers";
import { RibbonMenu } from "./ribbon_menu/ribbon_menu";

interface Props {
  onClick: () => void;
}

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
  }

  get focus(): ComposerFocusType {
    return this.composerFocusStore.activeComposer === this.composerInterface
      ? this.composerFocusStore.focusMode
      : "inactive";
  }

  get rect(): Rect {
    return this.composerRef.el?.getBoundingClientRect() || { x: 0, y: 0, width: 0, height: 0 };
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
      onComposerContentFocused: () =>
        this.composerFocusStore.focusComposer(this.composerInterface, {
          focusMode: "contentFocus",
        }),
      isDefaultFocus: false,
      inputStyle: cssPropertiesToCss({
        height: this.focus === "inactive" ? "24px" : "fit-content",
        "max-height": `130px`,
      }),
    };
  }

  toggleRibbon(): void {
    this.composerStore.cancelEdition();
    this.menuState.isOpen = !this.menuState.isOpen;
  }

  get isComposerVisible(): boolean {
    return !this.menuState.isOpen;
  }
}
