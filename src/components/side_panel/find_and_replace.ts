import * as owl from "@odoo/owl";
import { SpreadsheetEnv } from "../../types/index";
import { FindAndReplaceTerms } from "./translations_terms";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
<div class="o-find-and-replace" tabindex="0" t-on-focusin="onFocusSidePanel">
  <div class="o-section">
    <div t-esc="env._t('${FindAndReplaceTerms.Search}')" class="o-section-title"/>
    <div class="o-input-search-container">
      <input type="text" class="o-input o-input-with-count" t-on-input="onInput" t-on-keydown="onKeydownSearch">
      </input>
      <div class="o-input-count" t-if="hasSearchResult">
        <t t-esc="env.getters.getCurrentSelectedMatchIndex()+1"/>
        /
        <t t-esc="env.getters.getSearchMatches().length"/>
      </div>
    </div>
    <label class="o-far-checkbox">
      <input type="checkbox" t-model="state.searchOptions.matchCase" t-on-change="updateSearch()"/>
      <t t-esc="env._t('${FindAndReplaceTerms.MatchCase}')"/>
    </label>

    <label class="o-far-checkbox">
      <input type="checkbox" t-model="state.searchOptions.exactMatch" t-on-change="updateSearch()"/>
      <t t-esc="env._t('${FindAndReplaceTerms.ExactMatch}')"/>
    </label>inputSearch

    <label class="o-far-checkbox">
      <input type="checkbox" t-model="state.searchOptions.searchFormulas" t-on-change="searchFormulas"/>
      <t t-esc="env._t('${FindAndReplaceTerms.SearchFormulas}')"/>
    </label>
  </div>
  <div class="o-sidePanelButtons">
    <button t-att-disabled="!hasSearchResult" t-on-click="onSelectPreviousCell" class="o-sidePanelButton"
            t-esc="env._t('${FindAndReplaceTerms.Previous}')"/>
    <button t-att-disabled="!hasSearchResult" t-on-click="onSelectNextCell" class="o-sidePanelButton"
            t-esc="env._t('${FindAndReplaceTerms.Next}')"/>
  </div>

  <div class="o-section">
    <div t-esc="env._t('${FindAndReplaceTerms.Replace}')" class="o-section-title"/>
    <input type="text" class="o-input" t-model="state.replaceWith" t-on-keydown="onKeydownReplace"/>
    <label class="o-far-checkbox">
      <input t-att-disabled="state.searchOptions.searchFormulas" type="checkbox"
             t-model="state.replaceOptions.modifyFormulas"/>
      <t t-esc="env._t('${FindAndReplaceTerms.ReplaceFormulas}')"/>
    </label>
  </div>

  <div class="o-sidePanelButtons">
    <button t-att-disabled="env.getters.getCurrentSelectedMatchIndex() === null" t-on-click="replace"
            class="o-sidePanelButton" t-esc="env._t('${FindAndReplaceTerms.Replace}')"/>
    <button t-att-disabled="env.getters.getCurrentSelectedMatchIndex() === null" t-on-click="replaceAll"
            class="o-sidePanelButton" t-esc="env._t('${FindAndReplaceTerms.ReplaceAll}')"/>
  </div>

</div>
`;

const CSS = css/* scss */ `
  .o-find-and-replace {
    outline: none;
    height: 100%;
    .o-input-search-container {
      display: flex;
      .o-input-with-count {
        flex-grow: 1;
        width: auto;
      }
      .o-input-count {
        width: fit-content;
        padding: 4 0 4 4;
      }
    }
  }
`;

interface Props {}

interface FindAndReplaceState {
  toSearch: string;
  replaceWith: string;
  searchOptions: {
    matchCase: boolean;
    exactMatch: boolean;
    searchFormulas: boolean;
  };
  replaceOptions: {
    modifyFormulas: boolean;
  };
}

export class FindAndReplacePanel extends Component<Props, SpreadsheetEnv> {
  private getters = this.env.getters;
  static template = TEMPLATE;
  static style = CSS;
  private state: FindAndReplaceState = useState(this.initialState());
  private inDebounce;

  get hasSearchResult() {
    return this.env.getters.getCurrentSelectedMatchIndex() !== null;
  }

  mounted() {
    this.focusInput();
  }

  async willUnmount() {
    this.env.dispatch("CLEAR_SEARCH");
  }

  onInput(ev) {
    this.state.toSearch = ev.target.value;
    this.debouncedUpdateSearch();
  }

  onKeydownSearch(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      this.onSelectNextCell();
    }
  }

  onKeydownReplace(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      this.replace();
    }
  }

  onFocusSidePanel() {
    this.state.searchOptions.searchFormulas = this.getters.shouldShowFormulas();
    this.state.replaceOptions.modifyFormulas = this.state.searchOptions.searchFormulas
      ? this.state.searchOptions.searchFormulas
      : this.state.replaceOptions.modifyFormulas;
    this.env.dispatch("REFRESH_SEARCH");
  }

  searchFormulas() {
    this.env.dispatch("SET_FORMULA_VISIBILITY", { show: this.state.searchOptions.searchFormulas });
    this.state.replaceOptions.modifyFormulas = this.state.searchOptions.searchFormulas;
    this.updateSearch();
  }

  onSelectPreviousCell() {
    this.env.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
  }
  onSelectNextCell() {
    this.env.dispatch("SELECT_SEARCH_NEXT_MATCH");
  }
  updateSearch() {
    if (this.state.toSearch) {
      this.env.dispatch("UPDATE_SEARCH", {
        toSearch: this.state.toSearch,
        searchOptions: this.state.searchOptions,
      });
    }
  }
  debouncedUpdateSearch() {
    clearTimeout(this.inDebounce);
    this.inDebounce = setTimeout(() => this.updateSearch.call(this), 400);
  }

  replace() {
    this.env.dispatch("REPLACE_SEARCH", {
      replaceWith: this.state.replaceWith,
      replaceOptions: this.state.replaceOptions,
    });
  }

  replaceAll() {
    this.env.dispatch("REPLACE_ALL_SEARCH", {
      replaceWith: this.state.replaceWith,
      replaceOptions: this.state.replaceOptions,
    });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------
  private focusInput() {
    const input = this.el!.querySelector(`input`);
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
      replaceOptions: {
        modifyFormulas: false,
      },
    };
  }
}
