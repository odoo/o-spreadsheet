import { Component } from "@odoo/owl";
import { GRAY_300, SELECTION_BORDER_COLOR } from "../../../constants";
import { Store, useLocalStore, useStore } from "../../../store_engine";
import { ComposerFocusType, SpreadsheetChildEnv, UID } from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { ComposerSelection } from "../composer/abstract_composer_store";
import { Composer } from "../composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer_focus_store";
import { StandaloneComposerStore } from "./standalone_composer_store";
import { AutoCompleteProviderDefinition } from "../../../registries";

css/* scss */ `
  .o-spreadsheet {
    .o-standalone-composer {
      min-height: 24px;
      overflow: auto;
      box-sizing: border-box;

      border-bottom: 1px solid;
      border-color: ${GRAY_300};

      &.active {
        border-color: ${SELECTION_BORDER_COLOR};
      }

      &.o-invalid {
        border-bottom: 2px solid red;
      }

      /* As the standalone composer is potentially very small (eg. in a side panel), we remove the scrollbar display */
      scrollbar-width: none; /* Firefox */
      &::-webkit-scrollbar {
        display: none;
      }
    }
  }
`;

interface Props {
  onConfirm: (content: string) => void;
  composerContent: string;
  defaultRangeSheetId: UID;
  contextualAutocomplete?: AutoCompleteProviderDefinition;
  placeholder?: string;
  class?: string;
  invalid?: boolean;
}

export class StandaloneComposer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneComposer";
  static props = {
    composerContent: { type: String, optional: true },
    defaultRangeSheetId: { type: String, optional: true },
    onConfirm: Function,
    contextualAutocomplete: { type: Object, optional: true },
    placeholder: { type: String, optional: true },
    class: { type: String, optional: true },
    invalid: { type: Boolean, optional: true },
  };
  static components = { Composer };
  static defaultProps = {
    composerContent: "",
  };

  private composerFocusStore!: Store<ComposerFocusStore>;
  private standaloneComposerStore!: Store<StandaloneComposerStore>;
  private composerInterface!: ComposerInterface;
  readonly spreadsheetRect = useSpreadsheetRect();

  setup() {
    this.composerFocusStore = useStore(ComposerFocusStore);
    const standaloneComposerStore = useLocalStore(StandaloneComposerStore, () => ({
      onConfirm: this.props.onConfirm,
      content: this.props.composerContent,
      contextualAutocomplete: this.props.contextualAutocomplete,
      defaultRangeSheetId: this.props.defaultRangeSheetId,
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
