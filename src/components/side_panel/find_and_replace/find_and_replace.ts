import { onMounted, onWillUnmount, proxy, signal, useProps } from "@odoo/owl";
import { debounce } from "../../../helpers/misc";
import { zoneToXc } from "../../../helpers/zones";
import { Component, useExternalListener } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { _t } from "../../../translation";
import { SearchOptions } from "../../../types/find_and_replace";
import { DebouncedFunction, ValueAndLabel } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { keyboardEventToShortcutString } from "../../helpers/dom_helpers";
import { types } from "../../props_validation";
import { Select } from "../../select/select";
import { SelectionInput } from "../../selection_input/selection_input";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";
import { FindAndReplaceStore } from "./find_and_replace_store";

export class FindAndReplacePanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FindAndReplacePanel";
  static components = { SelectionInput, Section, Checkbox, ValidationMessages, Select };
  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  private searchInputRef = signal.ref(HTMLInputElement);
  private store!: Store<FindAndReplaceStore>;
  private state!: { dataRange: string };
  private updateSearchContent!: DebouncedFunction<(value: string) => void>;

  get hasSearchResult() {
    return this.store.selectedMatchIndex !== null;
  }

  get searchOptions() {
    return this.store.searchOptions;
  }

  get allSheetsMatchesCount() {
    const {
      allSheetsMatchesCount: count,
      allSheetsHiddenMatchesCount: hidden,
      searchOptions,
    } = this.store;
    let label =
      count === 1 ? _t("1 match in all sheets") : _t("%(count)s matches in all sheets", { count });
    if (searchOptions.includeHidden) {
      label += this.hiddenLabel(hidden);
    }
    return label;
  }

  get currentSheetMatchesCount() {
    const {
      activeSheetMatchesCount: count,
      activeSheetHiddenMatchesCount: hidden,
      searchOptions,
    } = this.store;
    const sheetName = this.env.model.getters.getSheetName(
      this.env.model.getters.getActiveSheetId()
    );
    let label =
      count === 1
        ? _t("1 match in %(sheetName)s", { sheetName })
        : _t("%(count)s matches in %(sheetName)s", { count, sheetName });
    if (searchOptions.includeHidden) {
      label += this.hiddenLabel(hidden);
    }
    return label;
  }

  get specificRangeMatchesCount() {
    const range = this.searchOptions.specificRange;
    if (!range) {
      return "";
    }
    const {
      specificRangeMatchesCount: count,
      specificRangeHiddenMatchesCount: hidden,
      searchOptions,
    } = this.store;
    const { sheetId, zone } = range;
    let label =
      count === 1
        ? _t("1 match in range %(range)s of %(sheetName)s", {
            range: zoneToXc(zone),
            sheetName: this.env.model.getters.getSheetName(sheetId),
          })
        : _t("%(count)s matches in range %(range)s of %(sheetName)s", {
            count,
            range: zoneToXc(zone),
            sheetName: this.env.model.getters.getSheetName(sheetId),
          });
    if (searchOptions.includeHidden) {
      label += this.hiddenLabel(hidden);
    }
    return label;
  }

  private hiddenLabel(hidden: number) {
    return hidden === 1
      ? ` (${_t("1 is hidden")})`
      : ` (${_t("%(hidden)s are hidden", { hidden })})`;
  }

  get searchInfo(): string[] {
    if (!this.store.toSearch) {
      return [];
    }
    return [
      this.specificRangeMatchesCount,
      this.currentSheetMatchesCount,
      this.allSheetsMatchesCount,
    ].filter(Boolean);
  }

  get hiddenSheetsWithMatchesInfo(): string[] {
    return this.store.hiddenSheetsWithMatches.map((sheetId) =>
      this.env.model.getters.getSheetName(sheetId)
    );
  }

  setup() {
    this.store = useLocalStore(FindAndReplaceStore);
    this.state = proxy({ dataRange: "" });
    onMounted(() => this.searchInputRef()?.focus());
    onWillUnmount(() => this.updateSearchContent.stopDebounce());
    this.updateSearchContent = debounce(this.store.updateSearchContent, 200);
    useExternalListener(
      window,
      "keydown",
      (ev: KeyboardEvent) => {
        const code = keyboardEventToShortcutString(ev);
        if (code === "Ctrl+F" || code === "Ctrl+H") {
          this.searchInputRef()?.focus();
          ev.preventDefault();
          ev.stopPropagation();
        }
      },
      { capture: true }
    );
  }

  onFocusSearch() {
    this.updateDataRange();
  }

  onSearchInput(ev: InputEvent) {
    this.updateSearchContent((ev.target as HTMLInputElement).value);
  }

  onKeydownPanel(ev: KeyboardEvent) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      this.props.onCloseSidePanel();
    }
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

  searchIncludeHidden(includeHidden: boolean) {
    this.store.updateSearchOptions({ includeHidden });
  }

  changeSearchScope(searchScope: SearchOptions["searchScope"]) {
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

  get specificRange(): string {
    const range = this.store.searchOptions.specificRange;
    return range ? this.env.model.getters.getRangeString(range, "forceSheetReference") : "";
  }

  get pendingSearch() {
    return this.updateSearchContent.isDebouncePending();
  }

  get selectionInputKey() {
    // Selections input are made to work with objects linked to a sheet id. They store the active sheet id at their creation,
    // and have specific behaviour linked to it (eg. go back to the initial sheet after confirmation).
    // We don't want all those behaviors here, so we force the recreation of the component when the active sheet changes.
    // The only drawback is that the input loses focus when changing sheet.
    return this.env.model.getters.getActiveSheetId();
  }

  get searchScopeOptions(): ValueAndLabel[] {
    return [
      { value: "allSheets", label: _t("All sheets") },
      { value: "activeSheet", label: _t("Current sheet") },
      { value: "specificRange", label: _t("Specific range") },
    ];
  }
}
