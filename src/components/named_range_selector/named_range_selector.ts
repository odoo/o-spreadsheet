import { _t } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef, useState } from "@odoo/owl";
import { Action, ActionSpec, createActions } from "../../actions/action";
import { zoneToXc } from "../../helpers";
import { getRefBoundingRect } from "../helpers/dom_helpers";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../helpers/top_bar_tool_hook";
import { MenuPopover, MenuState } from "../menu_popover/menu_popover";
import { TextInput } from "../text_input/text_input";

interface Props {}

type State = Omit<MenuState, "isOpen">;

export class NamedRangeSelector extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NamedRangeSelector";
  static props = {};
  static components = { TextInput, MenuPopover };

  topBarToolStore!: ToolBarDropdownStore;
  menuState = useState<State>({ anchorRect: null, menuItems: [] });

  private namedRangeSelectorRef = useRef("namedRangeSelectorRef");

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }

  changeInputValue(newValue: string) {
    // ADRM TODO: redirect on existing named range/range-like name
    // ADRM TODO: error on range-like name that are not on the sheet. Maybe always error ? Why bother redirect ?
    // ADRM TODO: focus back the grid
    if (!newValue) {
      return;
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const selection = this.selectedZone;

    const namedRange = this.env.model.getters.getNamedRangeFromZone(sheetId, selection);

    if (!namedRange) {
      this.env.model.dispatch("CREATE_NAMED_RANGE", {
        sheetId,
        rangeName: newValue,
        zone: selection,
      });
    } else {
      this.env.model.dispatch("UPDATE_NAMED_RANGE", {
        sheetId,
        newRangeName: newValue,
        oldRangeName: namedRange.rangeName,
        zone: selection,
      });
    }
  }

  get inputValue() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const selection = this.selectedZone;

    const namedRange = this.env.model.getters.getNamedRangeFromZone(sheetId, selection);
    return namedRange?.rangeName || zoneToXc(selection);
  }

  get selectedZone() {
    // ADRM TODO: unbounded zone
    return this.env.model.getters.getSelectedZone();
  }

  toggleDropdown() {
    this.topBarToolStore.openDropdown();
    this.menuState.anchorRect = getRefBoundingRect(this.namedRangeSelectorRef);
    this.menuState.menuItems = this.getNamedRangeMenuItems();
  }

  getNamedRangeMenuItems(): Action[] {
    const namedRanges = this.env.model.getters.getNamedRanges();
    const actionsSpecs: ActionSpec[] = [];
    for (const { rangeName, range } of namedRanges) {
      actionsSpecs.push({
        name: rangeName,
        execute: () => {
          const zone = range.zone;
          // ADRM TODO: better scroll into view ? ATM only the top-left cell is 100% visible & jump to correct sheet (make helper)
          this.env.model.selection.selectZone({
            cell: { col: zone.left, row: zone.top },
            zone,
          });
          this.topBarToolStore.closeDropdowns();
        },
        description: (env) => env.model.getters.getRangeString(range),
        icon: "o-spreadsheet-Icon.NAMED_RANGE", // ADRM TODO better icon or no icon and smaller width ?
      });
    }

    if (actionsSpecs.length > 0) {
      actionsSpecs.at(-1)!.separator = true;
    }

    actionsSpecs.push({
      name: _t("Manage named ranges"),
      execute: () => {
        this.env.openSidePanel("NamedRangesPanel", {});
        this.topBarToolStore.closeDropdowns();
      },
      icon: "o-spreadsheet-Icon.PLUS", // ADRM TODO better icon or no icon
    });

    return createActions(actionsSpecs);
  }
}
