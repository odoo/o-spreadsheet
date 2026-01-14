import { LINK_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { detectLink, urlRepresentation } from "@odoo/o-spreadsheet-engine/helpers/links";
import { canonicalizeNumberContent } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, useRef, useState } from "@odoo/owl";
import { markdownLink } from "../../../helpers";
import { linkMenuRegistry } from "../../../registries/menus/link_menu_registry";
import { Link, Position, Rect } from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { getRefBoundingRect } from "../../helpers/dom_helpers";
import { MenuPopover } from "../../menu_popover/menu_popover";

interface LinkEditorProps {
  cellPosition: Position;
  onClosed?: () => void;
}

interface State {
  label: string;
  url: string;
  isUrlEditable: boolean;
}

export class LinkEditor extends Component<LinkEditorProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LinkEditor";
  static props = {
    cellPosition: Object,
    onClosed: { type: Function, optional: true },
  };
  static components = { MenuPopover };
  menuItems = linkMenuRegistry.getMenuItems();
  private link: State = useState(this.defaultState);
  private menu = useState({
    isOpen: false,
  });
  private linkEditorMenuButtonRef = useRef("linkEditorMenuButton");
  urlInput = useRef("urlInput");

  setup() {
    onMounted(() => this.urlInput.el?.focus());
  }

  get defaultState(): State {
    const { col, row } = this.props.cellPosition;
    const sheetId = this.env.model.getters.getActiveSheetId();
    const cell = this.env.model.getters.getEvaluatedCell({ sheetId, col, row });
    if (cell.link) {
      return {
        url: cell.link.url,
        label: cell.formattedValue,
        isUrlEditable: cell.link.isUrlEditable,
      };
    }
    return {
      label: cell.formattedValue,
      url: "",
      isUrlEditable: true,
    };
  }

  get menuButtonRect(): Rect {
    return getRefBoundingRect(this.linkEditorMenuButtonRef);
  }

  onSpecialLink(ev: CustomEvent<string>) {
    const { detail: markdownLink } = ev;
    const link = detectLink(markdownLink);
    if (!link) {
      return;
    }
    this.link.url = link.url;
    this.link.label = link.label;
    this.link.isUrlEditable = link.isUrlEditable;
  }

  getUrlRepresentation(link: Link): string {
    return urlRepresentation(link, this.env.model.getters);
  }

  openMenu() {
    this.menu.isOpen = true;
  }

  removeLink() {
    this.link.url = "";
    this.link.isUrlEditable = true;
  }

  save() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const { col, row } = this.props.cellPosition;
    const locale = this.env.model.getters.getLocale();
    const label = this.link.label
      ? canonicalizeNumberContent(this.link.label, locale)
      : this.link.url;
    const style = this.env.model.getters.getCellStyle({ sheetId, col, row });
    this.env.model.dispatch("UPDATE_CELL", {
      col,
      row,
      sheetId,
      content: markdownLink(label, this.link.url),
      style: { ...style, textColor: LINK_COLOR },
    });
    this.props.onClosed?.();
  }

  cancel() {
    this.props.onClosed?.();
  }

  onKeyDown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        if (this.link.url) {
          this.save();
        }
        ev.stopPropagation();
        ev.preventDefault();
        break;
      case "Escape":
        this.cancel();
        ev.stopPropagation();
        break;
    }
  }
}

export const LinkEditorPopoverBuilder: PopoverBuilders = {
  onOpen: (position, getters): CellPopoverComponent<typeof LinkEditor> => {
    return {
      isOpen: true,
      props: { cellPosition: position },
      Component: LinkEditor,
      cellCorner: "bottom-left",
    };
  },
};
