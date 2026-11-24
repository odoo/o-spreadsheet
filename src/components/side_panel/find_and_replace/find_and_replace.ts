import { onMounted, onWillUnmount, proxy, signal, useListener, useProps } from "@odoo/owl";
import { debounce } from "../../../helpers/misc";
import { provideAndUsePlugin } from "../../../helpers/owl3_helpers";
import { zoneToXc } from "../../../helpers/zones";
import { _t } from "../../../translation";
import { SearchOptions } from "../../../types/find_and_replace";
import { DebouncedFunction, ValueAndLabel } from "../../../types/misc";
import { keyboardEventToShortcutString } from "../../helpers/dom_helpers";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";
import { Select } from "../../select/select";
import { SelectionInput } from "../../selection_input/selection_input";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";
import { FindAndReplacePlugin } from "./find_and_replace_plugin";

export class FindAndReplacePanel extends OSComponent {
  static template = "o-spreadsheet-FindAndReplacePanel";
  static components = { SelectionInput, Section, Checkbox, ValidationMessages, Select };
  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  private searchInputRef = signal.ref(HTMLInputElement);
  private findAndReplacePlugin = provideAndUsePlugin(FindAndReplacePlugin);
  private state!: { dataRange: string };
  private updateSearchContent!: DebouncedFunction<(value: string) => void>;

  get hasSearchResult() {
    return this.findAndReplacePlugin.selectedMatchIndex() !== null;
  }

  get searchOptions() {
    return this.findAndReplacePlugin.searchOptions();
  }

  get allSheetsInfo() {
    const { total, hidden } = this.findAndReplacePlugin.matchesCount.allSheets;
    let label =
      total === 1 ? _t("1 match in all sheets") : _t("%(total)s matches in all sheets", { total });
    if (this.searchOptions.includeHidden) {
      label += this.hiddenLabel(hidden);
    }
    return label;
  }

  get activeSheetInfo() {
    const { total, hidden } = this.findAndReplacePlugin.matchesCount.activeSheet;
    const sheetName = this.model().getters.getSheetName(this.model().getters.getActiveSheetId());
    let label =
      total === 1
        ? _t("1 match in '%(sheetName)s'", { sheetName })
        : _t("%(total)s matches in '%(sheetName)s'", { total, sheetName });
    if (this.searchOptions.includeHidden) {
      label += this.hiddenLabel(hidden);
    }
    return label;
  }

  get specificRangeInfo() {
    const range = this.searchOptions.specificRange;
    if (!range || range.invalidSheetName || range.invalidXc) {
      return "";
    }
    const { total, hidden } = this.findAndReplacePlugin.matchesCount.specificRange;
    const rangeString = zoneToXc(range.zone);
    const sheetName = this.model().getters.getSheetName(range.sheetId);
    let label =
      total === 1
        ? _t("1 match in range %(rangeString)s of '%(sheetName)s'", {
            rangeString,
            sheetName,
          })
        : _t("%(total)s matches in range %(rangeString)s of '%(sheetName)s'", {
            total,
            rangeString,
            sheetName,
          });
    if (this.searchOptions.includeHidden) {
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
    if (!this.findAndReplacePlugin.toSearch()) {
      return [];
    }
    return [this.specificRangeInfo, this.activeSheetInfo, this.allSheetsInfo].filter(Boolean);
  }

  get hiddenSheetsWithMatchesInfo(): string[] {
    return this.findAndReplacePlugin
      .hiddenSheetsWithMatches()
      .map((sheetId) => this.model().getters.getSheetName(sheetId));
  }

  setup() {
    this.state = proxy({ dataRange: "" });
    onMounted(() => this.searchInputRef()?.focus());
    onWillUnmount(() => this.updateSearchContent.stopDebounce());
    this.updateSearchContent = debounce(
      (value: string) => this.findAndReplacePlugin.updateSearchContent(value),
      200
    );
    useListener(
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

  onReplaceInput(ev: InputEvent) {
    this.findAndReplacePlugin.updateReplaceContent((ev.target as HTMLInputElement).value);
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
      ev.shiftKey
        ? this.findAndReplacePlugin.selectPreviousMatch()
        : this.findAndReplacePlugin.selectNextMatch();
    }
  }

  onKeydownReplace(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      this.findAndReplacePlugin.replace();
    }
  }

  searchFormulas(searchFormulas: boolean) {
    this.findAndReplacePlugin.searchFormulas(searchFormulas);
  }

  searchExactMatch(exactMatch: boolean) {
    this.findAndReplacePlugin.updateSearchOptions({ exactMatch });
  }

  searchMatchCase(matchCase: boolean) {
    this.findAndReplacePlugin.updateSearchOptions({ matchCase });
  }

  searchIncludeHidden(includeHidden: boolean) {
    this.findAndReplacePlugin.updateSearchOptions({ includeHidden });
  }

  changeSearchScope(searchScope: SearchOptions["searchScope"]) {
    this.findAndReplacePlugin.updateSearchOptions({ searchScope });
  }

  onSearchRangeChanged(ranges: string[]) {
    this.state.dataRange = ranges[0];
  }

  updateDataRange() {
    if (!this.state.dataRange || this.searchOptions.searchScope !== "specificRange") {
      return;
    }
    const specificRange = this.model().getters.getRangeFromSheetXC(
      this.model().getters.getActiveSheetId(),
      this.state.dataRange
    );
    this.findAndReplacePlugin.updateSearchOptions({ specificRange });
  }

  get specificRange(): string {
    const range = this.searchOptions.specificRange;
    return range ? this.model().getters.getRangeString(range, "forceSheetReference") : "";
  }

  get pendingSearch() {
    return this.updateSearchContent.isDebouncePending();
  }

  get selectionInputKey() {
    // Selections input are made to work with objects linked to a sheet id. They store the active sheet id at their creation,
    // and have specific behaviour linked to it (eg. go back to the initial sheet after confirmation).
    // We don't want all those behaviors here, so we force the recreation of the component when the active sheet changes.
    // The only drawback is that the input loses focus when changing sheet.
    return this.model().getters.getActiveSheetId();
  }

  get searchScopeOptions(): ValueAndLabel[] {
    return [
      { value: "allSheets", label: _t("All sheets") },
      { value: "activeSheet", label: _t("Current sheet") },
      { value: "specificRange", label: _t("Specific range") },
    ];
  }
}
