import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { SearchOptions } from "../../../plugins/ui_feature";
import { SpreadsheetChildEnv } from "../../../types/index";
import { css } from "../../helpers/css";

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
        padding: 4 0 4 4;
      }
    }
  }
`;

interface Props {
  onCloseSidePanel: () => void;
}

export class FindAndReplacePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FindAndReplacePanel";

  private debounceTimeoutId;
  private showFormulaState: boolean = false;

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

  setup() {
    this.showFormulaState = this.env.model.getters.shouldShowFormulas();

    onMounted(() => this.searchInput.el?.focus());

    onWillUnmount(() => {
      clearTimeout(this.debounceTimeoutId);
      this.env.model.dispatch("CLEAR_SEARCH");
      this.env.model.dispatch("SET_FORMULA_VISIBILITY", { show: this.showFormulaState });
    });

    useEffect(
      () => {
        const showFormula = this.env.model.getters.shouldShowFormulas();
        this.updateSearch({ searchFormulas: showFormula });
      },
      () => [this.env.model.getters.shouldShowFormulas()]
    );
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

  searchFormulas(ev) {
    const showFormula = ev.target.checked;
    this.env.model.dispatch("SET_FORMULA_VISIBILITY", {
      show: showFormula,
    });
    this.updateSearch({ searchFormulas: showFormula });
  }

  searchExactMatch(ev) {
    const exactMatch = ev.target.checked;
    this.updateSearch({ exactMatch });
  }

  searchMatchCase(ev) {
    const matchCase = ev.target.checked;
    this.updateSearch({ matchCase });
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
