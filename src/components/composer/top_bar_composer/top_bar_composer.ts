import { DESKTOP_TOPBAR_TOOLBAR_HEIGHT } from "../../../constants";
import { Component } from "../../../owl3_compatibility_layer";
import { useStore } from "../../../store_engine/store_hooks";
import { CSSProperties, ComposerFocusType } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { cssPropertiesToCss } from "../../helpers/css";
import { useModel } from "../../owl_plugins/model_plugin";
import { ComposerSelection } from "../composer/abstract_composer_store";
import { CellComposerStore } from "../composer/cell_composer_store";
import { Composer } from "../composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer_focus_store";
const COMPOSER_MAX_HEIGHT = 300;

export class TopBarComposer extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBarComposer";
  static components = { Composer };

  private model = useModel();
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
    if (this.model().getters.isCurrentSheetLocked()) {
      style["pointer-events"] = "none";
    }
    style.height = this.focus === "inactive" ? `${DESKTOP_TOPBAR_TOOLBAR_HEIGHT}px` : "fit-content";
    return cssPropertiesToCss(style);
  }

  onFocus(selection: ComposerSelection) {
    this.composerFocusStore.focusComposer(this.composerInterface, { selection });
  }
}
