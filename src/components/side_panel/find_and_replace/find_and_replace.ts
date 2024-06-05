import { Component, onMounted, useRef, useState } from "@odoo/owl";
import { zoneToXc } from "../../../helpers";
import { Store, useLocalStore } from "../../../store_engine";
import { _t } from "../../../translation";
import { SpreadsheetChildEnv } from "../../../types/index";
import { css } from "../../helpers/css";
import { SelectionInput } from "../../selection_input/selection_input";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";
import { FindAndReplaceStore } from "./find_and_replace_store";

css/* scss */ `
  .o-find-and-replace {
    outline: none;
    height: 100%;
    .o-input-search-container {
      display: flex;
      .o-input-with-count {
        flex-grow: 1;
        width: auto;
      }
      .o-input-without-count {
        width: 100%;
      }
      .o-input-count {
        width: fit-content;
        padding: 4px 0 4px 4px;
      }
    }

    .o-matches-count div {
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
  }
`;

interface Props {
  onCloseSidePanel: () => void;
}

export class FindAndReplacePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FindAndReplacePanel";
  static components = { SelectionInput, Section, Checkbox };
  static props = {
    onCloseSidePanel: Function,
  };

  private searchInput = useRef("searchInput");
  private store!: Store<FindAndReplaceStore>;
  private state!: { dataRange: string };

  get hasSearchResult() {
    return this.store.selectedMatchIndex !== null;
  }

  get searchOptions() {
    return this.store.searchOptions;
  }

  get allSheetsMatchesCount() {
    return _t("%s in all sheets", this.store.allSheetMatchesCount);
  }

  get currentSheetMatchesCount() {
    return _t("%(matches)s in sheet %(sheetName)s", {
      matches: this.store.activeSheetMatchesCount,
      sheetName: this.env.model.getters.getSheetName(this.env.model.getters.getActiveSheetId()),
    });
  }

  get specificRangeMatchesCount() {
    const range = this.searchOptions.specificRange;
    if (!range) {
      return "";
    }
    const { sheetId, zone } = range;
    return _t("%(matches)s in range %(range)s of sheet %(sheetName)s", {
      matches: this.store.specificRangeMatchesCount,
      range: zoneToXc(zone),
      sheetName: this.env.model.getters.getSheetName(sheetId),
    });
  }

  setup() {
    this.store = useLocalStore(FindAndReplaceStore);
    this.state = useState({ dataRange: "" });
    onMounted(() => this.searchInput.el?.focus());
  }

  onFocusSearch() {
    this.updateDataRange();
  }

  onSearchInput(ev: InputEvent) {
    this.store.updateSearchContent((ev.target as HTMLInputElement)?.value || "");
  }

  onKeydownSearch(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      ev.shiftKey ? this.store.selectPreviousMatch() : this.store.selectNextMatch();
    }
  }

  onKeydownReplace(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      this.store.replace();
    }
  }

  searchFormulas(searchFormulas: boolean) {
    this.store.searchFormulas(searchFormulas);
  }

  searchExactMatch(exactMatch: boolean) {
    this.store.updateSearchOptions({ exactMatch });
  }

  searchMatchCase(matchCase: boolean) {
    this.store.updateSearchOptions({ matchCase });
  }

  changeSearchScope(ev) {
    const searchScope = ev.target.value;
    this.store.updateSearchOptions({ searchScope });
  }

  onSearchRangeChanged(ranges: string[]) {
    this.state.dataRange = ranges[0];
  }

  updateDataRange() {
    if (!this.state.dataRange || this.searchOptions.searchScope !== "specificRange") {
      return;
    }
    const specificRange = this.env.model.getters.getRangeFromSheetXC(
      this.env.model.getters.getActiveSheetId(),
      this.state.dataRange
    );
    this.store.updateSearchOptions({ specificRange });
  }
}
