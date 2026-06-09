import { onMounted, props } from "@odoo/owl";
import { Token } from "../../../formulas/tokenizer";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore, useStore } from "../../../store_engine/store_hooks";
import { Color, ComposerFocusType } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { cssPropertiesToCss } from "../../helpers/css";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { types } from "../../props_validation";
import { ComposerSelection } from "../composer/abstract_composer_store";
import { Composer } from "../composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer_focus_store";
import { StandaloneComposerStore } from "./standalone_composer_store";

export class StandaloneComposer extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneComposer";
  static components = { Composer };

  protected props = props(
    {
      onConfirm: types.function<(content: string) => void>(),
      "composerContent?": types.string(),
      defaultRangeSheetId: types.UID(),
      "defaultStatic?": types.boolean(),
      "contextualAutocomplete?": types.AutoCompleteProviderDefinition(),
      "placeholder?": types.string(),
      "title?": types.string(),
      "class?": types.string(),
      "invalid?": types.boolean(),
      "autofocus?": types.boolean(),
      "getContextualColoredSymbolToken?": types.function<(token: Token) => Color>(),
    },
    {
      composerContent: "",
      defaultStatic: false,
    }
  );

  private composerFocusStore!: Store<ComposerFocusStore>;
  private standaloneComposerStore!: Store<StandaloneComposerStore>;
  private composerInterface!: ComposerInterface;
  readonly spreadsheetRect = useSpreadsheetRect();

  setup() {
    this.composerFocusStore = useStore(ComposerFocusStore);
    const standaloneComposerStore = useLocalStore(StandaloneComposerStore, () => ({
      onConfirm: this.props.onConfirm,
      content: this.props.composerContent,
      defaultStatic: this.props.defaultStatic ?? false,
      contextualAutocomplete: this.props.contextualAutocomplete,
      defaultRangeSheetId: this.props.defaultRangeSheetId,
      getContextualColoredSymbolToken: this.props.getContextualColoredSymbolToken,
    }));
    this.standaloneComposerStore = standaloneComposerStore;
    this.composerInterface = {
      id: "standaloneComposer",
      get editionMode() {
        return standaloneComposerStore.editionMode;
      },
      startEdition: this.standaloneComposerStore.startEdition,
      setCurrentContent: this.standaloneComposerStore.setCurrentContent,
      stopEdition: this.standaloneComposerStore.stopEdition,
    };
    onMounted(() => {
      if (this.props.autofocus && this.focus === "inactive") {
        this.composerFocusStore.focusComposer(this.composerInterface, {});
        this.composerFocusStore.activeComposer.editionMode;
      }
    });
  }

  get focus(): ComposerFocusType {
    return this.composerFocusStore.activeComposer === this.composerInterface
      ? this.composerFocusStore.focusMode
      : "inactive";
  }

  get composerStyle(): string {
    return this.props.invalid
      ? cssPropertiesToCss({ padding: "1px 0px 0px 0px" })
      : cssPropertiesToCss({ padding: "1px 0px" });
  }

  get containerClass(): string {
    const classes = [
      this.focus === "inactive" ? "" : "active",
      this.props.invalid ? "o-invalid" : "",
      this.props.class || "",
    ];
    return classes.join(" ");
  }

  onFocus(selection: ComposerSelection) {
    this.composerFocusStore.focusComposer(this.composerInterface, { selection });
  }
}
