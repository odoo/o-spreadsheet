import { onMounted, onPatched, props, proxy, signal } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { ComposerFocusType } from "../../types/misc";
import { PropsOf } from "../../types/props_of";
import { Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { Ripple } from "../animation/ripple";
import { BottomBar } from "../bottom_bar/bottom_bar";
import { CellComposerStore } from "../composer/composer/cell_composer_store";
import { Composer } from "../composer/composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer/composer_focus_store";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { useModel } from "../owl_plugins/model_plugin";
import { types } from "../props_validation";
import { RibbonMenu } from "./ribbon_menu/ribbon_menu";

export class SmallBottomBar extends Component<SpreadsheetChildEnv> {
  static components = { Composer, BottomBar, Ripple, RibbonMenu };
  static template = "o-spreadsheet-SmallBottomBar";

  protected props = props({
    onClick: types.function([]),
  });

  private composerFocusStore!: Store<ComposerFocusStore>;
  private composerStore!: Store<CellComposerStore>;
  private composerInterface!: ComposerInterface;
  private composerRef = signal<HTMLElement | null>(null);

  private menuState = proxy({
    isOpen: false,
  });

  private model = useModel();
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

    const autoFocusComposer = () => {
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
    };
    onMounted(autoFocusComposer);
    onPatched(autoFocusComposer);
  }

  get focus(): ComposerFocusType {
    return this.composerFocusStore.activeComposer === this.composerInterface
      ? this.composerFocusStore.focusMode
      : "inactive";
  }

  get showFxIcon(): boolean {
    return (
      this.focus === "inactive" &&
      !this.composerStore.currentContent &&
      !this.composerStore.placeholder
    );
  }

  get rect(): Rect {
    return getElBoundingRect(this.composerRef());
  }

  get composerProps(): PropsOf<Composer> {
    const { width, height } = this.model().getters.getSheetViewDimensionWithHeaders();
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
      showAssistant: false, // Hide assistant in small composer as it gets cropped ATM
      placeholder: this.composerStore.placeholder,
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
