import { Component } from "@odoo/owl";
import { SELECTION_BORDER_COLOR } from "../../../constants";
import { Store, useLocalStore, useStore } from "../../../store_engine";
import { ComposerFocusType, SpreadsheetChildEnv } from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { ComposerSelection } from "../composer/abstract_composer_store";
import { CellComposer } from "../composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer_focus_store";
import { StandaloneComposerStore } from "./standalone_composer_store";

css/* scss */ `
  .o-spreadsheet {
    .o-standalone-composer {
      height: 28px;
      overflow: auto;
      box-sizing: border-box;

      border-radius: 4px;
      border: 1px solid;
      border-color: #666666;

      &.active {
        border-color: ${SELECTION_BORDER_COLOR};
      }

      &.o-invalid {
        border: 2px solid red;
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
  placeholder?: string;
  class?: string;
  invalid?: boolean;
}

export class StandaloneComposer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneComposer";
  static props = {
    composerContent: { type: String, optional: true },
    onConfirm: Function,
    placeholder: { type: String, optional: true },
    class: { type: String, optional: true },
    invalid: { type: Boolean, optional: true },
  };
  static components = { CellComposer };
  static defaultProps = {
    composerContent: "",
  };

  private composerFocusStore!: Store<ComposerFocusStore>;
  private standaloneComposerStore!: Store<StandaloneComposerStore>;
  private composerInterface!: ComposerInterface;

  setup() {
    this.composerFocusStore = useStore(ComposerFocusStore);
    const standaloneComposerStore = useLocalStore(StandaloneComposerStore, () => ({
      onConfirm: this.props.onConfirm,
      content: this.props.composerContent,
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
      ? cssPropertiesToCss({ padding: "3px 0px 3px 4px" })
      : cssPropertiesToCss({ padding: "4px 0px 4px 5px" });
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
