import { Component } from "@odoo/owl";
import { DESKTOP_TOPBAR_TOOLBAR_HEIGHT } from "../../../constants";
import { Store, useStore } from "../../../store_engine";
import { CSSProperties, ComposerFocusType, SpreadsheetChildEnv } from "../../../types/index";
import { cssPropertiesToCss } from "../../helpers/css";
import { ComposerSelection } from "../composer/abstract_composer_store";
import { CellComposerStore } from "../composer/cell_composer_store";
import { Composer } from "../composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer_focus_store";

const COMPOSER_MAX_HEIGHT = 300;

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

  get showFxIcon(): boolean {
    return (
      this.focus === "inactive" &&
      !this.composerStore.currentContent &&
      !this.composerStore.placeholder
    );
  }

  get composerStyle(): string {
    const style: CSSProperties = {
      padding: "5px 0px 5px 8px",
      "max-height": `${COMPOSER_MAX_HEIGHT}px`,
      "line-height": "24px",
    };
    style.height = this.focus === "inactive" ? `${DESKTOP_TOPBAR_TOOLBAR_HEIGHT}px` : "fit-content";
    return cssPropertiesToCss(style);
  }

  onFocus(selection: ComposerSelection) {
    this.composerFocusStore.focusComposer(this.composerInterface, { selection });
  }
}
