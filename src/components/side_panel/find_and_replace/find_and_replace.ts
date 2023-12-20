import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { zoneToXc } from "../../../helpers";
import { _t } from "../../../translation";
import { SearchOptions } from "../../../types/find_and_replace";
import { SpreadsheetChildEnv } from "../../../types/index";
import { css } from "../../helpers/css";
import { SelectionInput } from "../../selection_input/selection_input";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

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

  private debounceTimeoutId;
  private initialShowFormulaState: boolean = false;

  private dataRange: string = "";
  private searchInput = useRef("searchInput");
  private replaceInput = useRef("replaceInput");

  get hasSearchResult() {
    return this.env.model.getters.getCurrentSelectedMatchIndex() !== null;
  }

  get pendingSearch() {
    return this.debounceTimeoutId !== undefined;
  }

  get searchOptions() {
    return this.env.model.getters.getSearchOptions();
  }

  get toSearch() {
    return (this.searchInput.el as HTMLInputElement)?.value || "";
  }

  get toReplace() {
    return (this.replaceInput.el as HTMLInputElement)?.value || "";
  }

  get allSheetsMatchesCount() {
    return _t("%s in all sheets", this.env.model.getters.getAllSheetMatchesCount());
  }

  get currentSheetMatchesCount() {
    return _t("%(matches)s in sheet %(sheetName)s", {
      matches: this.env.model.getters.getActiveSheetMatchesCount(),
      sheetName: this.env.model.getters.getSheetName(this.env.model.getters.getActiveSheetId()),
    });
  }

  get specificRangeMatchesCount() {
    const range = this.searchOptions.specificRange;
    if (!range) {
      return "";
    }
    const { _sheetId, _zone } = range;
    return _t("%(matches)s in range %(range)s of sheet %(sheetName)s", {
      matches: this.env.model.getters.getSpecificRangeMatchesCount().toString(),
      range: zoneToXc(_zone),
      sheetName: this.env.model.getters.getSheetName(_sheetId),
    });
  }

  setup() {
    this.initialShowFormulaState = this.env.model.getters.shouldShowFormulas();
    onMounted(() => this.searchInput.el?.focus());

    onWillUnmount(() => {
      clearTimeout(this.debounceTimeoutId);
      this.env.model.dispatch("CLEAR_SEARCH");
      this.env.model.dispatch("SET_FORMULA_VISIBILITY", { show: this.initialShowFormulaState });
    });

    useEffect(
      () => {
        const showFormula = this.env.model.getters.shouldShowFormulas();
        this.updateSearch({ searchFormulas: showFormula });
      },
      () => [this.env.model.getters.shouldShowFormulas()]
    );
  }

  onFocusSearch() {
    this.updateDataRange();
  }
  onInput() {
    this.debouncedUpdateSearch();
  }

  onKeydownSearch(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      this.onSelectNextCell();
    }
  }

  onKeydownReplace(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      this.replace();
    }
  }

  searchFormulas(showFormula: boolean) {
    this.env.model.dispatch("SET_FORMULA_VISIBILITY", {
      show: showFormula,
    });
    this.updateSearch({ searchFormulas: showFormula });
  }

  searchExactMatch(exactMatch: boolean) {
    this.updateSearch({ exactMatch });
  }

  searchMatchCase(matchCase: boolean) {
    this.updateSearch({ matchCase });
  }

  changeSearchScope(ev) {
    const searchScope = ev.target.value;
    this.updateSearch({ searchScope });
  }

  onSearchRangeChanged(ranges: string[]) {
    this.dataRange = ranges[0];
  }

  updateDataRange() {
    if (!this.dataRange) {
      return;
    }
    if (this.searchOptions.searchScope === "specificRange") {
      const specificRange = this.env.model.getters.getRangeFromSheetXC(
        this.env.model.getters.getActiveSheetId(),
        this.dataRange
      ).rangeData;
      this.updateSearch({ specificRange });
    }
  }

  onSelectPreviousCell() {
    this.env.model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
  }

  onSelectNextCell() {
    this.env.model.dispatch("SELECT_SEARCH_NEXT_MATCH");
  }

  updateSearch(updateSearchOptions?: Partial<SearchOptions>) {
    const searchOptions = {
      ...this.env.model.getters.getSearchOptions(),
      ...updateSearchOptions,
    };
    this.env.model.dispatch("UPDATE_SEARCH", {
      toSearch: this.toSearch,
      searchOptions,
    });
  }

  debouncedUpdateSearch() {
    clearTimeout(this.debounceTimeoutId);
    this.debounceTimeoutId = setTimeout(() => {
      this.updateSearch();
      this.debounceTimeoutId = undefined;
    }, 200);
  }

  replace() {
    this.env.model.dispatch("REPLACE_SEARCH", {
      replaceWith: this.toReplace,
    });
  }

  replaceAll() {
    this.env.model.dispatch("REPLACE_ALL_SEARCH", {
      replaceWith: this.toReplace,
    });
  }
}

FindAndReplacePanel.props = {
  onCloseSidePanel: Function,
};
