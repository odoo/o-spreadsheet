import { proxy, signal } from "@odoo/owl";
import { Action, ActionSpec, createActions } from "../../actions/action";
import { HIGHLIGHT_COLOR } from "../../constants";
import { rangeReference } from "../../helpers/references";
import { fuzzyLookup } from "../../helpers/search";
import {
  interactiveCreateNamedRange,
  interactiveUpdateNamedRange,
} from "../../helpers/ui/named_range_interactive";
import { zoneToXc } from "../../helpers/zones";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { HighlightStore } from "../../stores/highlight_store";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { Highlight } from "../../types/misc";
import { Range } from "../../types/range";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../helpers/top_bar_tool_hook";
import { MenuPopover, MenuState } from "../menu_popover/menu_popover";
import { useModel } from "../owl_plugins/model_plugin";
import { TextInput } from "../text_input/text_input";

interface State extends Omit<MenuState, "isOpen"> {
  searchedText?: string;
}

export class NamedRangeSelector extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NamedRangeSelector";
  static components = { TextInput, MenuPopover };

  private model = useModel();
  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  topBarToolStore!: ToolBarDropdownStore;
  menuState = proxy<State>({ anchorRect: null, menuItems: [] });

  private namedRangeSelectorRef = signal<HTMLElement | null>(null);

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
  }

  onInput(value: string) {
    this.menuState.searchedText = value || undefined;
    this.menuState.menuItems = this.getNamedRangeMenuItems();
  }

  changeInputValue(newValue: string) {
    this.stopEditingNamedRange();
    if (!newValue) {
      return;
    }
    newValue = newValue.replace(/ /g, "_");

    const sheetId = this.model().getters.getActiveSheetId();
    const selection = this.selectedZone;
    if (rangeReference.test(newValue)) {
      const range = this.model().getters.getRangeFromSheetXC(sheetId, newValue);
      this.navigateToRange(range);
      return;
    }

    const namedRange = this.model().getters.getNamedRange(newValue);
    if (namedRange) {
      this.navigateToRange(namedRange.range);
      return;
    }

    const namedRangeInZone = this.model().getters.getNamedRangeFromZone(sheetId, selection);
    if (!namedRangeInZone) {
      interactiveCreateNamedRange(this.model(), this.env, {
        name: newValue,
        ranges: [this.model().getters.getRangeDataFromZone(sheetId, selection)],
      });
    } else {
      interactiveUpdateNamedRange(this.model(), this.env, {
        newRangeName: newValue,
        oldRangeName: namedRangeInZone.name,
        ranges: [this.model().getters.getRangeData(namedRangeInZone.range)],
      });
    }
  }

  get inputValue() {
    const sheetId = this.model().getters.getActiveSheetId();
    const namedRange = this.model().getters.getNamedRangeFromZone(sheetId, this.selectedZone);
    return namedRange?.name || zoneToXc(this.selectedZone);
  }

  get selectedZone() {
    return this.model().getters.getSelectedZone();
  }

  openDropdown() {
    this.topBarToolStore.openDropdown();
    this.menuState.anchorRect = getElBoundingRect(this.namedRangeSelectorRef());
    this.menuState.menuItems = this.getNamedRangeMenuItems();
  }

  getNamedRangeMenuItems(): Action[] {
    let actionsSpecs: ActionSpec[] = [];
    for (const { name: name, range } of this.model().getters.getNamedRanges()) {
      const highlightProvider = {
        get highlights(): Highlight[] {
          return [{ range, color: HIGHLIGHT_COLOR, noFill: true }];
        },
      };
      actionsSpecs.push({
        name: name,
        execute: () => {
          this.navigateToRange(range);
          this.stopEditingNamedRange();
        },
        description: (model) => model.getters.getRangeString(range),
        icon: "o-spreadsheet-Icon.NAMED_RANGE",
        onStartHover: (model, env) => env.getStore(HighlightStore).register(highlightProvider),
        onStopHover: (model, env) => env.getStore(HighlightStore).unRegister(highlightProvider),
      });
    }

    if (this.menuState.searchedText) {
      actionsSpecs = fuzzyLookup(
        this.menuState.searchedText,
        actionsSpecs,
        (action) => action.name as string
      );
    }

    if (actionsSpecs.length > 0) {
      actionsSpecs.at(-1)!.separator = true;
    }

    if (!this.env.isSmall) {
      actionsSpecs.push({
        name: _t("Manage named ranges"),
        execute: () => {
          this.env.openSidePanel("NamedRangesPanel", {});
          this.stopEditingNamedRange();
        },
        icon: "o-spreadsheet-Icon.COG",
      });
    }

    return createActions(actionsSpecs);
  }

  private stopEditingNamedRange() {
    this.menuState.searchedText = undefined;
    this.topBarToolStore.closeDropdowns();
    this.DOMFocusableElementStore.focus();
  }

  private navigateToRange(range: Range) {
    const { sheetId, zone } = range;
    const doesRangeExist = this.model().getters.checkZonesExistInSheet(sheetId, [zone]);
    if (doesRangeExist !== CommandResult.Success) {
      this.env.raiseError(
        _t(
          "The range you specified is outside of the sheet.\n\nIf you meant to create a named range, named range cannot have the same name as a cell reference. Please choose another name."
        )
      );
      return;
    }
    const activeSheetId = this.model().getters.getActiveSheetId();
    if (activeSheetId !== sheetId) {
      this.model().dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: sheetId });
    }

    // First select the bottom-right cell to try to scroll the sheet so that the whole range is visible
    this.model().selection.selectCell(zone.right, zone.bottom);
    this.model().selection.selectZone({
      cell: { col: zone.left, row: zone.top },
      zone,
    });
  }

  get selectionKey(): string {
    const sheetId = this.model().getters.getActiveSheetId();
    return `${sheetId}-${zoneToXc(this.selectedZone)}`;
  }

  onInputFocused() {
    this.menuState.searchedText = undefined;
    this.openDropdown();
  }

  onInputBlur() {
    this.stopEditingNamedRange();
  }
}
