import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import {
  Component,
  onMounted,
  onPatched,
  onWillUnmount,
  useEffect,
  useExternalListener,
  useRef,
  useState,
} from "@odoo/owl";
import { throttle } from "../../../helpers";
import { interactiveRenameSheet } from "../../../helpers/ui/sheet_interactive";
import { MenuItemRegistry } from "../../../registries/menu_items_registry";
import { getSheetMenuRegistry } from "../../../registries/menus";
import { Store, useStore } from "../../../store_engine";
import { DOMFocusableElementStore } from "../../../stores/DOM_focus_store";
import { Command, CommandResult, DispatchResult, isSheetDependent, Rect } from "../../../types";
import { Ripple } from "../../animation/ripple";
import { ColorPicker } from "../../color_picker/color_picker";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";

interface Props {
  sheetId: string;
  openContextMenu: (registry: MenuItemRegistry, ev: MouseEvent) => void;
  style?: string;
  onMouseDown: (ev: PointerEvent) => void;
}

interface State {
  isEditing: boolean;
  pickerOpened: boolean;
}

const getSheetLockAnimation = (
  duration: number,
  iterations: number
): [Keyframe[], KeyframeAnimationOptions] => {
  return [
    [{ backgroundColor: "light-dark(darkgrey, lightgrey)" }],
    {
      duration,
      iterations,
      easing: "cubic-bezier(1, 0, 0, 1)",
    },
  ];
};

export class BottomBarSheet extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBarSheet";
  static props = {
    sheetId: String,
    openContextMenu: Function,
    style: { type: String, optional: true },
    onMouseDown: { type: Function, optional: true },
  };
  static components = { Ripple, ColorPicker };
  static defaultProps = {
    onMouseDown: () => {},
    style: "",
  };

  private state = useState<State>({ isEditing: false, pickerOpened: false });

  private sheetDivRef = useRef("sheetDiv");
  private iconRef = useRef("icon");
  private sheetNameRef = useRef("sheetNameSpan");

  private editionState: "initializing" | "editing" = "initializing";

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;
  setup() {
    onPatched(() => {
      if (this.sheetNameRef.el && this.state.isEditing && this.editionState === "initializing") {
        this.editionState = "editing";
        this.focusInputAndSelectContent();
      }
    });
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    useExternalListener(window, "click", () => (this.state.pickerOpened = false));

    useEffect(
      (sheetId) => {
        if (this.props.sheetId === sheetId) {
          this.scrollToSheet();
        }
      },
      () => [this.env.model.getters.getActiveSheetId()]
    );

    onMounted(() => {
      const animateLockedSheet = throttle(
        () =>
          this.sheetDivRef.el
            ?.animate(...getSheetLockAnimation(200, 1))
            .finished.then(() => this.iconRef.el?.animate(...getSheetLockAnimation(200, 2))),
        800
      );

      this.env.model.on(
        "command-rejected",
        this,
        ({ command, result }: { command: Command; result: DispatchResult }) => {
          if (result.isCancelledBecause(CommandResult.SheetLocked)) {
            if (
              !command ||
              (!isSheetDependent(command) && this.isSheetActive) ||
              (isSheetDependent(command) && command.sheetId === this.props.sheetId)
            ) {
              this.scrollToSheet();
              animateLockedSheet();
            }
          }
        }
      );
    });
    onWillUnmount(() => {
      this.env.model.off("command-rejected", this);
    });
  }

  private focusInputAndSelectContent() {
    if (!this.state.isEditing || !this.sheetNameRef.el) {
      return;
    }

    this.sheetNameRef.el.focus();
    const selection = window.getSelection();
    if (selection && this.sheetNameRef.el.firstChild) {
      selection.setBaseAndExtent(
        this.sheetNameRef.el.firstChild,
        0,
        this.sheetNameRef.el.firstChild,
        this.sheetNameRef.el.textContent?.length || 0
      );
    }
  }

  private scrollToSheet() {
    this.sheetDivRef.el?.scrollIntoView?.({
      behavior: "smooth",
      inline: "nearest",
    });
  }

  onFocusOut() {
    if (this.state.isEditing && this.editionState !== "initializing") {
      this.stopEdition();
    }
  }

  onClick() {
    if (!this.env.isMobile()) {
      return;
    }
    this.activateSheet();
  }

  onMouseDown(ev: PointerEvent) {
    if (this.env.isMobile()) {
      return;
    }
    this.activateSheet();
    this.props.onMouseDown(ev);
  }

  private activateSheet() {
    this.env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.env.model.getters.getActiveSheetId(),
      sheetIdTo: this.props.sheetId,
    });
    this.scrollToSheet();
  }

  onDblClick() {
    if (this.env.model.getters.isReadonly() || this.isSheetLocked) {
      return;
    }
    this.startEdition();
  }

  onKeyDown(ev: KeyboardEvent) {
    if (!this.state.isEditing) {
      return;
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      this.stopEdition();
      this.DOMFocusableElementStore.focus();
    }
    if (ev.key === "Escape") {
      this.cancelEdition();
      this.DOMFocusableElementStore.focus();
    }
  }

  onMouseEventSheetName(ev: MouseEvent) {
    if (this.state.isEditing) {
      ev.stopPropagation();
    }
  }

  private startEdition() {
    this.state.isEditing = true;
    this.editionState = "initializing";
  }

  private stopEdition() {
    if (!this.state.isEditing || !this.sheetNameRef.el) {
      return;
    }

    this.state.isEditing = false;
    this.editionState = "initializing";
    this.sheetNameRef.el.blur();

    const inputValue = this.getInputContent() || "";

    interactiveRenameSheet(this.env, this.props.sheetId, inputValue, () => this.startEdition());
  }

  private cancelEdition() {
    this.state.isEditing = false;
    this.editionState = "initializing";
    this.sheetNameRef.el?.blur();
    this.setInputContent(this.sheetName);
  }

  onIconClick(ev: MouseEvent) {
    if (!this.isSheetActive) {
      this.activateSheet();
    }
    this.props.openContextMenu(this.contextMenuRegistry, ev);
  }

  onContextMenu(ev: MouseEvent) {
    if (!this.isSheetActive) {
      this.activateSheet();
    }
    this.props.openContextMenu(this.contextMenuRegistry, ev);
  }

  private getInputContent(): string | undefined | null {
    return this.sheetNameRef.el?.textContent;
  }

  private setInputContent(content: string) {
    if (this.sheetNameRef.el) {
      this.sheetNameRef.el.textContent = content;
    }
  }

  onColorPicked(color: string) {
    this.state.pickerOpened = false;
    this.env.model.dispatch("COLOR_SHEET", { sheetId: this.props.sheetId, color });
  }

  get colorPickerAnchorRect(): Rect {
    const button = this.sheetDivRef.el!;
    return getBoundingRectAsPOJO(button);
  }

  get contextMenuRegistry() {
    return getSheetMenuRegistry({
      renameSheetCallback: () => {
        this.scrollToSheet();
        this.startEdition();
      },
      openSheetColorPickerCallback: () => {
        this.state.pickerOpened = true;
      },
    });
  }

  get isSheetActive() {
    return this.env.model.getters.getActiveSheetId() === this.props.sheetId;
  }

  get sheetName() {
    return this.env.model.getters.getSheetName(this.props.sheetId);
  }

  get sheetColorStyle() {
    const color = this.env.model.getters.getSheet(this.props.sheetId).color || "";
    return cssPropertiesToCss({ background: color });
  }

  get isSheetLocked() {
    return this.env.model.getters.isSheetLocked(this.props.sheetId);
  }
}
