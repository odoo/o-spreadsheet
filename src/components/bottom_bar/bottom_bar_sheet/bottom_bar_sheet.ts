import { onMounted, onPatched, onWillUnmount, props, proxy, signal, types } from "@odoo/owl";
import { throttle } from "../../../helpers/misc";
import { interactiveRenameSheet } from "../../../helpers/ui/sheet_interactive";
import { Component, useExternalListener, useLayoutEffect } from "../../../owl3_compatibility_layer";
import { MenuItemRegistry } from "../../../registries/menu_items_registry";
import { getSheetMenuRegistry } from "../../../registries/menus/sheet_menu_registry";
import { useStore } from "../../../store_engine/store_hooks";
import { DOMFocusableElementStore } from "../../../stores/DOM_focus_store";
import { Command, CommandResult, DispatchResult, isSheetDependent } from "../../../types/commands";
import { UID } from "../../../types/misc";
import { Rect } from "../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { Ripple } from "../../animation/ripple";
import { ColorPicker } from "../../color_picker/color_picker";
import { cssPropertiesToCss } from "../../helpers/css";
import { getElBoundingRect } from "../../helpers/dom_helpers";

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

export class BottomBarSheet extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBarSheet";
  static components = { Ripple, ColorPicker };
  protected props = props(
    {
      sheetId: types.string(),
      openContextMenu: types.function<[registry: MenuItemRegistry, ev: MouseEvent]>([
        types.instanceOf(MenuItemRegistry),
        types.instanceOf(MouseEvent),
      ]),
      "style?": types.string(),
      "onMouseDown?": types.function<[ev: PointerEvent]>([types.instanceOf(PointerEvent)]),
    },
    {
      onMouseDown: () => {},
      style: "",
    }
  );

  private state = proxy<State>({ isEditing: false, pickerOpened: false });

  private sheetDivRef = signal<HTMLElement | null>(null);
  private iconRef = signal<HTMLElement | null>(null);
  private sheetNameRef = signal<HTMLElement | null>(null);

  private editionState: "initializing" | "editing" = "initializing";

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;
  setup() {
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    useExternalListener(window, "click", () => (this.state.pickerOpened = false));

    // Subscribe BottomBarSheet to isEditing so onPatched fires when it changes.
    // (Without this, isEditing is read inside Ripple's slot render, which subscribes
    // Ripple's signalComputation instead of ours, so our onPatched never fires.)
    useLayoutEffect(
      () => {},
      () => [this.state.isEditing]
    );

    onPatched(() => {
      if (this.sheetNameRef() && this.state.isEditing && this.editionState === "initializing") {
        this.editionState = "editing";
        this.focusInputAndSelectContent();
      }
    });

    useLayoutEffect(
      (sheetId: UID) => {
        if (this.props.sheetId === sheetId) {
          this.scrollToSheet();
        }
      },
      () => [this.env.model.getters.getActiveSheetId()]
    );

    onMounted(() => {
      const animateLockedSheet = throttle(
        () =>
          this.sheetDivRef()
            ?.animate(...getSheetLockAnimation(200, 1))
            .finished.then(() => this.iconRef()?.animate(...getSheetLockAnimation(200, 2))),
        800
      );

      this.env.model.on(
        "command-rejected",
        this,
        async ({ command, result }: { command: Command; result: DispatchResult }) => {
          if (result.isCancelledBecause(CommandResult.SheetLocked)) {
            if (
              !command ||
              (!isSheetDependent(command) && this.isSheetActive) ||
              (isSheetDependent(command) && command.sheetId === this.props.sheetId)
            ) {
              this.scrollToSheet();
              await animateLockedSheet();
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
    const el = this.sheetNameRef();
    if (!this.state.isEditing || !el) {
      return;
    }

    el.focus();
    const selection = window.getSelection();
    if (selection && el.firstChild) {
      selection.setBaseAndExtent(el.firstChild, 0, el.firstChild, el.textContent?.length || 0);
    }
  }

  private scrollToSheet() {
    this.sheetDivRef()?.scrollIntoView?.({
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
    if (!this.state.isEditing || !this.sheetNameRef()) {
      return;
    }

    this.state.isEditing = false;
    this.editionState = "initializing";
    this.sheetNameRef()?.blur();

    const inputValue = this.getInputContent() || "";

    interactiveRenameSheet(this.env, this.props.sheetId, inputValue, () => this.startEdition());
  }

  private cancelEdition() {
    this.state.isEditing = false;
    this.editionState = "initializing";
    this.sheetNameRef()?.blur();
    this.setInputContent(this.sheetName);
  }

  onIconClick(ev: MouseEvent) {
    if (!this.isSheetActive) {
      this.activateSheet();
    }
    this.props.openContextMenu(this.contextMenuRegistry, ev);
  }

  onContextMenu(ev: MouseEvent) {
    if ((ev.target as HTMLElement).isContentEditable) {
      return;
    }
    if (!this.isSheetActive) {
      this.activateSheet();
    }
    ev.preventDefault();
    this.props.openContextMenu(this.contextMenuRegistry, ev);
  }

  private getInputContent(): string | undefined | null {
    return this.sheetNameRef()?.textContent;
  }

  private setInputContent(content: string) {
    const el = this.sheetNameRef();
    if (el) {
      el.textContent = content;
    }
  }

  onColorPicked(color: string) {
    this.state.pickerOpened = false;
    this.env.model.dispatch("COLOR_SHEET", { sheetId: this.props.sheetId, color });
  }

  get colorPickerAnchorRect(): Rect {
    const button = this.sheetDivRef();
    return getElBoundingRect(button);
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
