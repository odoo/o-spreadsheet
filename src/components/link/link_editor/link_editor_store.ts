import { markdownLink } from "../../../helpers";
import { detectLink, urlRepresentation } from "../../../helpers/links";
import { canonicalizeNumberContent } from "../../../helpers/locale";
import { Get } from "../../../store_engine";
import { SpreadsheetStore } from "../../../store_engine/spreadsheet_store";

import { Position } from "../../../types";

export class LinkEditorStore extends SpreadsheetStore {
  label: string;
  url: string;
  isUrlEditable: boolean;
  isExternal: boolean = false;

  constructor(get: Get, private cellPosition: Position, private onClosed?: () => void) {
    super(get);

    const { col, row } = this.cellPosition;
    const sheetId = this.model.getters.getActiveSheetId();
    const cell = this.model.getters.getEvaluatedCell({ sheetId, col, row });
    if (cell.link) {
      this.url = cell.link.url;
      this.label = cell.formattedValue;
      this.isUrlEditable = cell.link.isUrlEditable;
      return;
    }

    this.label = cell.formattedValue;
    this.url = "";
    this.isUrlEditable = true;
  }

  onSpecialLink(ev: CustomEvent<string>) {
    const { detail: markdownLink } = ev;
    const link = detectLink(markdownLink);
    if (!link) {
      return;
    }
    this.url = link.url;
    this.label = link.label;
    this.isUrlEditable = link.isUrlEditable;
  }

  removeLink() {
    this.url = "";
    this.isUrlEditable = true;
  }

  save() {
    const { col, row } = this.cellPosition;
    const locale = this.model.getters.getLocale();
    const label = this.label ? canonicalizeNumberContent(this.label, locale) : this.url;
    this.model.dispatch("UPDATE_CELL", {
      col: col,
      row: row,
      sheetId: this.model.getters.getActiveSheetId(),
      content: markdownLink(label, this.url),
    });
    this.onClosed?.();
  }

  cancel() {
    this.onClosed?.();
  }

  onKeyDown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        if (this.url) {
          this.save();
        }
        ev.stopPropagation();
        break;
      case "Escape":
        this.cancel();
        ev.stopPropagation();
        break;
    }
  }

  getUrlRepresentation(): string {
    return urlRepresentation(this, this.model.getters);
  }
}
