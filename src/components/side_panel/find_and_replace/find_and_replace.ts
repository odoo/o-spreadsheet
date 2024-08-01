import { Component, onMounted, onWillUnmount, useEffect, useRef, useState } from "@odoo/owl";
import type { SpreadsheetChildEnv } from "../../../types/index";
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
        padding: 4px 0 4px 4px;
      }
    }
  }
`;

interface Props {
  onCloseSidePanel: () => void;
}

interface FindAndReplaceState {
  toSearch: string;
  replaceWith: string;
  searchOptions: {
    matchCase: boolean;
    exactMatch: boolean;
    searchFormulas: boolean;
  };
}

export class FindAndReplacePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FindAndReplacePanel";
  private state: FindAndReplaceState = useState(this.initialState());
  private debounceTimeoutId;
  private showFormulaState: boolean = false;

  private searchInput = useRef("searchInput");

  get hasSearchResult() {
    return this.env.model.getters.getCurrentSelectedMatchIndex() !== null;
  }

  get pendingSearch() {
    return this.debounceTimeoutId !== undefined;
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
        this.state.searchOptions.searchFormulas = this.env.model.getters.shouldShowFormulas();
        this.searchFormulas();
      },
      () => [this.env.model.getters.shouldShowFormulas()]
    );
  }

  onInput(ev) {
    this.state.toSearch = ev.target.value;
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

  searchFormulas() {
    this.env.model.dispatch("SET_FORMULA_VISIBILITY", {
      show: this.state.searchOptions.searchFormulas,
    });
    this.updateSearch();
  }

  onSelectPreviousCell() {
    this.env.model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
  }
  onSelectNextCell() {
    this.env.model.dispatch("SELECT_SEARCH_NEXT_MATCH");
  }
  updateSearch() {
    this.env.model.dispatch("UPDATE_SEARCH", {
      toSearch: this.state.toSearch,
      searchOptions: this.state.searchOptions,
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
      replaceWith: this.state.replaceWith,
    });
  }

  replaceAll() {
    this.env.model.dispatch("REPLACE_ALL_SEARCH", {
      replaceWith: this.state.replaceWith,
    });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private initialState(): FindAndReplaceState {
    return {
      toSearch: "",
      replaceWith: "",
      searchOptions: {
        matchCase: false,
        exactMatch: false,
        searchFormulas: false,
      },
    };
  }
}

FindAndReplacePanel.props = {
  onCloseSidePanel: Function,
};
