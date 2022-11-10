import { Component, onMounted, onWillUnmount, useRef, useState } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../types/index";
import { css } from "../../helpers/css";

css/* scss */ `
  .o-find-and-replace {
    .o-far-item {
      display: block;
      .o-far-checkbox {
        display: inline-block;
        .o-far-input {
          vertical-align: middle;
        }
        .o-far-label {
          position: relative;
          top: 1.5px;
          padding-left: 4px;
        }
      }
    }
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
  private inDebounce;
  private showFormulaState: boolean = false;

  private findAndReplaceRef = useRef("findAndReplace");

  get hasSearchResult() {
    return this.env.model.getters.getCurrentSelectedMatchIndex() !== null;
  }

  setup() {
    this.showFormulaState = this.env.model.getters.shouldShowFormulas();

    onMounted(() => this.focusInput());

    onWillUnmount(() => {
      this.env.model.dispatch("CLEAR_SEARCH");
      this.env.model.dispatch("SET_FORMULA_VISIBILITY", { show: this.showFormulaState });
    });
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

  onFocusSidePanel() {
    this.state.searchOptions.searchFormulas = this.env.model.getters.shouldShowFormulas();
    this.env.model.dispatch("REFRESH_SEARCH");
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
    clearTimeout(this.inDebounce);
    this.inDebounce = setTimeout(() => this.updateSearch.call(this), 400);
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
  private focusInput() {
    const el = this.findAndReplaceRef.el!;
    const input = el.querySelector(`input`);
    if (input) {
      input.focus();
    }
  }

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
