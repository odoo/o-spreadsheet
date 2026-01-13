import { _t, rangeReference } from "@odoo/o-spreadsheet-engine";
import { HIGHLIGHT_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef, useState } from "@odoo/owl";
import { Action, ActionSpec, createActions } from "../../actions/action";
import { fuzzyLookup, zoneToXc } from "../../helpers";
import {
  interactiveCreateNamedRange,
  interactiveUpdateNamedRange,
} from "../../helpers/ui/named_range_interactive";
import { Store, useStore } from "../../store_engine";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { HighlightStore } from "../../stores/highlight_store";
import { CommandResult, Highlight, Range } from "../../types";
import { getRefBoundingRect } from "../helpers/dom_helpers";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../helpers/top_bar_tool_hook";
import { MenuPopover, MenuState } from "../menu_popover/menu_popover";
import { TextInput } from "../text_input/text_input";

interface Props {}

interface State extends Omit<MenuState, "isOpen"> {
  searchedText?: string;
}

export class NamedRangeSelector extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NamedRangeSelector";
  static props = {};
  static components = { TextInput, MenuPopover };

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  topBarToolStore!: ToolBarDropdownStore;
  menuState = useState<State>({ anchorRect: null, menuItems: [] });

  private namedRangeSelectorRef = useRef("namedRangeSelectorRef");

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

    const sheetId = this.env.model.getters.getActiveSheetId();
    const selection = this.selectedZone;
    if (rangeReference.test(newValue)) {
      const range = this.env.model.getters.getRangeFromSheetXC(sheetId, newValue);
      this.navigateToRange(range);
      return;
    }

    const namedRange = this.env.model.getters.getNamedRange(newValue);
    if (namedRange) {
      this.navigateToRange(namedRange.range);
      return;
    }

    const namedRangeInZone = this.env.model.getters.getNamedRangeFromZone(sheetId, selection);
    if (!namedRangeInZone) {
      interactiveCreateNamedRange(this.env, {
        name: newValue,
        ranges: [this.env.model.getters.getRangeDataFromZone(sheetId, selection)],
      });
    } else {
      interactiveUpdateNamedRange(this.env, {
        newRangeName: newValue,
        oldRangeName: namedRangeInZone.name,
        ranges: [this.env.model.getters.getRangeData(namedRangeInZone.range)],
      });
    }
  }

  get inputValue() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const namedRange = this.env.model.getters.getNamedRangeFromZone(sheetId, this.selectedZone);
    return namedRange?.name || zoneToXc(this.selectedZone);
  }

  get selectedZone() {
    return this.env.model.getters.getSelectedZone();
  }

  openDropdown() {
    this.topBarToolStore.openDropdown();
    this.menuState.anchorRect = getRefBoundingRect(this.namedRangeSelectorRef);
    this.menuState.menuItems = this.getNamedRangeMenuItems();
  }

  getNamedRangeMenuItems(): Action[] {
    let actionsSpecs: ActionSpec[] = [];
    for (const { name: name, range } of this.env.model.getters.getNamedRanges()) {
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
        description: (env) => env.model.getters.getRangeString(range),
        icon: "o-spreadsheet-Icon.NAMED_RANGE",
        onStartHover: (env) => env.getStore(HighlightStore).register(highlightProvider),
        onStopHover: (env) => env.getStore(HighlightStore).unRegister(highlightProvider),
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

    actionsSpecs.push({
      name: _t("Manage named ranges"),
      execute: () => {
        this.env.openSidePanel("NamedRangesPanel", {});
        this.stopEditingNamedRange();
      },
      icon: "o-spreadsheet-Icon.EDIT",
    });

    return createActions(actionsSpecs);
  }

  private stopEditingNamedRange() {
    this.menuState.searchedText = undefined;
    this.topBarToolStore.closeDropdowns();
    this.DOMFocusableElementStore.focus();
  }

  private navigateToRange(range: Range) {
    const { sheetId, zone } = range;
    const doesRangeExist = this.env.model.getters.checkZonesExistInSheet(sheetId, [zone]);
    if (doesRangeExist !== CommandResult.Success) {
      this.env.raiseError(_t("The range you specified is outside of the sheet."));
      return;
    }
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    if (activeSheetId !== sheetId) {
      this.env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: sheetId });
    }

    // First select the bottom-right cell to try to scroll the sheet so that the whole range is visible
    this.env.model.selection.selectCell(zone.right, zone.bottom);
    this.env.model.selection.selectZone({
      cell: { col: zone.left, row: zone.top },
      zone,
    });
  }

  get selectionKey(): string {
    const sheetId = this.env.model.getters.getActiveSheetId();
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
