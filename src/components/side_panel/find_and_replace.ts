import * as owl from "@odoo/owl";
import { Cell, SpreadsheetEnv } from "../../types/index";
import { FindAndReplaceTerms } from "./translations_terms";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

const SEARCH_COLOR = "#8B008B";
const TEMPLATE = xml/* xml */ `
  <div class="o-find-and-replace" tabindex="0" t-on-focusin="onFocusSidePanel">
    <div class="o-section">
      <div t-esc="env._t('${FindAndReplaceTerms.Search}')" class="o-section-title"/>
        <input type="text" class="o-input o-input-with-count" t-on-input="onInput">
        </input>
        <div class="o-input-count" t-if="state.currentSearch.index !== null">
          <t t-esc="state.currentSearch.index+1"/> / <t t-esc="state.currentSearch.matches.length"/>
      </div>
      <label class="o-far-checkbox">
        <input type="checkbox" t-model="state.searchOptions.matchCase" t-on-change="updateSearch(0)"/>
        <t t-esc="env._t('${FindAndReplaceTerms.MatchCase}')"/>
      </label>

      <label class="o-far-checkbox">
        <input type="checkbox" t-model="state.searchOptions.exactMatch" t-on-change="updateSearch(0)"/>
        <t t-esc="env._t('${FindAndReplaceTerms.ExactMatch}')"/>
      </label>

      <label class="o-far-checkbox">
        <input type="checkbox" t-model="state.searchOptions.searchFormulas" t-on-change="searchFormulas"/>
        <t t-esc="env._t('${FindAndReplaceTerms.SearchFormulas}')"/>
      </label>
    </div>
    <div class="o-sidePanelButtons">
      <button t-att-disabled="state.currentSearch.index === null" t-on-click="selectNextCell(-1)" class="o-sidePanelButton" t-esc="env._t('${FindAndReplaceTerms.Previous}')"/>
      <button t-att-disabled="state.currentSearch.index === null" t-on-click="selectNextCell(1)" class="o-sidePanelButton" t-esc="env._t('${FindAndReplaceTerms.Next}')"/>
    </div>

    <div class="o-section">
      <div t-esc="env._t('${FindAndReplaceTerms.Replace}')" class="o-section-title"/>
      <input type="text" class="o-input" t-model="state.replaceWith"/>
      <label class="o-far-checkbox">
      <input t-att-disabled="state.searchOptions.searchFormulas" type="checkbox" t-model="state.replaceOptions.modifyFormulas"/>
      <t t-esc="env._t('${FindAndReplaceTerms.ReplaceFormulas}')"/>
    </label>
    </div>

    <div class="o-sidePanelButtons">
      <button t-att-disabled="state.currentSearch.index === null" t-on-click="replace" class="o-sidePanelButton" t-esc="env._t('${FindAndReplaceTerms.Replace}')"/>
      <button t-att-disabled="state.currentSearch.index === null" t-on-click="replaceAll" class="o-sidePanelButton" t-esc="env._t('${FindAndReplaceTerms.ReplaceAll}')"/>
    </div>

  </div>
`;

const CSS = css/* scss */ `
  .o-find-and-replace {
    outline: none;
    height: 100%;
    .o-input-with-count {
      display: inline-block;
      width: 85%;
      box-sizing: border-box;
    }
    .o-input-count {
      width: 10%;
      padding: 0 1% 0 4%;
      display: inline-block;
    }
    }
  }
`;

interface Props {}

interface FindAndReplaceState {
  toSearch: string;
  replaceWith: string;
  currentSearch: {
    matches: Cell[];
    index: number | null;
  };
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
  static template = TEMPLATE;
  static style = CSS;
  private getters = this.env.getters;
  private state: FindAndReplaceState = useState(this.initialState());
  private inDebounce;

  async willUnmount() {
    this.env.dispatch("REMOVE_ALL_HIGHLIGHTS");
  }

  onInput(ev) {
    this.state.currentSearch.index = null;
    this.state.toSearch = ev.target.value;
    this.debouncedUpdateSearch(0);
  }

  onFocusSidePanel() {
    this.updateSearch(0);
    this.state.searchOptions.searchFormulas = this.env.getters.shouldShowFormulas();
    this.state.replaceOptions.modifyFormulas = this.state.searchOptions.searchFormulas
      ? this.state.searchOptions.searchFormulas
      : this.state.replaceOptions.modifyFormulas;
  }

  searchFormulas() {
    this.env.dispatch("SET_FORMULA_VISIBILITY", { show: this.state.searchOptions.searchFormulas });
    this.updateSearch(0);
    this.state.replaceOptions.modifyFormulas = this.state.searchOptions.searchFormulas;
  }

  /**
   * Update the search and select a cell according to changeIndex (see selectNextCell)
   */
  updateSearch(changeIndex: number) {
    clearTimeout(this.inDebounce);
    const matches = this.findMatches();
    if (matches.length === 0) {
      this.state.currentSearch = {
        matches,
        index: null,
      };
      this.env.dispatch("REMOVE_ALL_HIGHLIGHTS");
      return;
    }
    this.state.currentSearch = {
      matches,
      index: this.state.currentSearch.index ? this.state.currentSearch.index : 0,
    };
    this.selectNextCell(changeIndex);
  }

  debouncedUpdateSearch(changeIndex: number) {
    clearTimeout(this.inDebounce);
    this.inDebounce = setTimeout(() => this.updateSearch.call(this, changeIndex), 400);
  }

  replace() {
    const currentSearch = this.state.currentSearch;
    if (currentSearch.index === null) {
      return;
    }
    const positionCell = currentSearch.matches[currentSearch.index];
    const toReplace: string | null = this.toReplace(positionCell);
    if (toReplace === null) {
      this.selectNextCell(1);
    } else {
      const newContent = toReplace.toString().replace(this.regexSearch(), this.state.replaceWith);
      this.env.dispatch("SET_VALUE", { xc: positionCell.xc, text: newContent });
      this.updateSearch(0);
    }
  }

  replaceAll() {
    const currentSearch = this.state.currentSearch;
    Object.values(currentSearch.matches).forEach((cell) => {
      const toReplace: string | null = this.toReplace(cell);
      if (toReplace !== null) {
        const newContent = toReplace.toString().replace(this.regexSearch(), this.state.replaceWith);
        this.env.dispatch("SET_VALUE", { xc: cell.xc, text: newContent });
      }
    });
    this.updateSearch(0);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Add highlights to the matches:
   * All matches will have background highlights except for
   * the match corresponding to index which will have a hiupdateSearchglight of type "all".
   */
  private addHighlights() {
    this.env.dispatch("REMOVE_ALL_HIGHLIGHTS");
    const index = this.state.currentSearch.index;
    if (index === null) {
      return;
    }
    const positionCell = this.state.currentSearch.matches[index];
    const rangesMatches = {};
    const rangePosition = {};
    for (const cell of this.state.currentSearch.matches) {
      if (cell.col === positionCell.col && cell.row === positionCell.row) {
        rangePosition[cell.xc] = SEARCH_COLOR;
      } else {
        rangesMatches[cell.xc] = SEARCH_COLOR;
      }
    }
    this.env.dispatch("ADD_HIGHLIGHTS", { ranges: rangesMatches, highlightType: "background" });
    this.env.dispatch("ADD_HIGHLIGHTS", { ranges: rangePosition, highlightType: "all" });
    this.env.dispatch("CHANGE_ACTIVE_XC", { xc: positionCell.xc });
  }

  /**
   * Goes through all the cells and find the cells that match with the
   * current search and the searchOptions.
   * returns a list of cells
   */

  private findMatches(): any[] {
    const cells = this.getters.getCells();
    const matches: Cell[] = [];
    const searchOptions = this.state.searchOptions;

    let field = searchOptions.searchFormulas? "content" : "value";
    if (this.state.toSearch) {
      for (const cell of Object.values(cells)) {
        if (this.regexSearch().test(cell[field])) {
          matches.push(cell);
        }
      }
    }

    return matches.sort(this.sortByRowThenColumn);
  }

  private sortByRowThenColumn(a, b) {
    if (a.row === b.row) {
      return a.col - b.col;
    }
    return a.row > b.row ? 1 : -1;
  }

  private initialState(): FindAndReplaceState {
    return {
      toSearch: "",
      replaceWith: "",
      currentSearch: {
        matches: [],
        index: null,
      },
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

  private regexSearch(){
    const searchOptions = this.state.searchOptions;
    let searchValue = this.state.toSearch;
    let flags = "g";
    if (!searchOptions.matchCase) {
      flags += "i";
    }
    if (searchOptions.exactMatch) {
      searchValue = `^${searchValue}$`;
    }
    return  RegExp(searchValue, flags);
  }

  /**
   * select the next matching cell in the state:
   *  -changes the index according to changeIndex
   *    the new index will be index = index + changeIndex.
   *    Therefore to select the next index use 1, keep the same index use 0 and
   *    select the previous index use -1.
   *  -Adapt the highlights
   */
  private selectNextCell(changeIndex: number) {
    const matches = this.state.currentSearch.matches;
    let nextIndex: number;
    if (this.state.currentSearch.index === null) {
      nextIndex = 0;
    } else {
      nextIndex = this.state.currentSearch.index + changeIndex;
    }
    // it seems JS can't do % of negative values : https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
    nextIndex = ((nextIndex % matches.length) + matches.length) % matches.length;
    this.state.currentSearch.index = nextIndex;
    this.addHighlights();
  }

  /**
   * Find what part of the matching cell should be replaced and
   * return it as a string. Depending on the searchOptions and replaceOptions
   * this could be cell.content, cell.value or nothing.
   * in the case nothing should be replace it returns null.
   */
  private toReplace(cell: Cell) {
    if (this.state.searchOptions.searchFormulas) {
      return cell.content;
    } else if (this.state.replaceOptions.modifyFormulas || cell.type !== "formula") {
      return cell.value;
    }
    return null;
  }
}
