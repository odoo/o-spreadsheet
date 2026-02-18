import { urlRegistry, urlRepresentation } from "@odoo/o-spreadsheet-engine/helpers/links";
import { canonicalizeNumberContent } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, useRef, useState } from "@odoo/owl";
import { fuzzyLookup, markdownLink } from "../../../helpers";
import { Link, Position } from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { MenuPopover } from "../../menu_popover/menu_popover";

interface LinkEditorProps {
  cellPosition: Position;
  onClosed?: () => void;
}

interface LinkProposal {
  text: string;
  icon?: string;
  index: number;
  onSelect: () => void;
}

interface LinkState {
  label: string;
  url: string;
  isUrlEditable: boolean;
  linksByCategory: Record<string, LinkProposal>;
  linksList: LinkProposal[];
  selectedIndex: number;
}

export class LinkEditor extends Component<LinkEditorProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LinkEditor";
  static props = {
    cellPosition: Object,
    onClosed: { type: Function, optional: true },
  };
  static components = { MenuPopover };
  static size = { maxHeight: 500 };

  urlInput = useRef("urlInput");
  suggestionListRef = useRef("suggestionList");
  urlInputContainer = useRef("urlInputContainer");

  private state: LinkState = useState(this.defaultState);

  // private selection: ProposalsState = useState({
  //   index: -1,
  //   proposals: {},
  //   proposalList: [],
  // });

  setup() {
    this.computeLinks();
    onMounted(() => this.urlInput.el?.focus());
  }

  computeLinks() {
    this.state.selectedIndex = -1;
    this.state.linksByCategory = this.linkProposalByCategory;
    this.state.linksList = Object.values(this.state.linksByCategory).flat();
  }

  get linkProposalByCategory(): Record<string, LinkProposal> {
    const proposals = {};
    let counter = -1;
    for (const category of urlRegistry.getKeys()) {
      const spec = urlRegistry.get(category);
      const inputVal = (this.urlInput?.el as HTMLInputElement)?.value || "";
      const linkProposals = spec.getLinkProposals?.(this.env) || [];
      const links =
        inputVal && this.state.isUrlEditable
          ? fuzzyLookup(
              inputVal,
              linkProposals,
              (link) => spec.title + spec.urlRepresentation(link.url, this.env.model.getters)
            )
          : linkProposals;

      if (links.length === 0) {
        continue;
      }
      proposals[spec.title] = links.map((link) => {
        counter++;
        const text = spec.urlRepresentation(link.url, this.env.model.getters);
        const index = counter;
        return {
          text,
          icon: link.icon,
          index,
          onSelect: () => {
            this.state.url = link.url;
            this.state.label = link.label;
            this.state.isUrlEditable = link.isUrlEditable;
            this.state.selectedIndex = index;
            this.urlInputContainer.el?.focus();
          },
        };
      });
    }
    return proposals;
  }

  get defaultState(): LinkState {
    const { col, row } = this.props.cellPosition;
    const sheetId = this.env.model.getters.getActiveSheetId();
    const cell = this.env.model.getters.getEvaluatedCell({ sheetId, col, row });
    if (cell.link) {
      return {
        url: cell.link.url,
        label: cell.formattedValue,
        isUrlEditable: cell.link.isUrlEditable,
        selectedIndex: -1,
        linksByCategory: this.linkProposalByCategory,
        linksList: Object.values(this.linkProposalByCategory).flat(),
      };
    }
    return {
      label: cell.formattedValue,
      url: "",
      isUrlEditable: true,
      selectedIndex: -1,
      linksByCategory: this.linkProposalByCategory,
      linksList: Object.values(this.linkProposalByCategory).flat(),
    };
  }

  getUrlRepresentation(link: Link): string {
    return urlRepresentation(link, this.env.model.getters);
  }

  removeLink() {
    this.state.url = "";
    this.state.isUrlEditable = true;
    this.computeLinks();
  }

  save() {
    const { col, row } = this.props.cellPosition;
    const locale = this.env.model.getters.getLocale();
    const label = this.state.label
      ? canonicalizeNumberContent(this.state.label, locale)
      : this.state.url;
    this.env.model.dispatch("UPDATE_CELL", {
      col: col,
      row: row,
      sheetId: this.env.model.getters.getActiveSheetId(),
      content: markdownLink(label, this.state.url),
    });
    this.props.onClosed?.();
  }

  cancel() {
    this.props.onClosed?.();
  }

  onKeyDown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        if (this.state.url) {
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

  onInputKeyDown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        if (this.state.selectedIndex !== -1) {
          const proposal = this.state.linksList[this.state.selectedIndex];
          if (proposal) {
            const currentUrl = this.state.url;
            proposal.onSelect();
            if (this.state.url !== currentUrl) {
              ev.stopPropagation();
              ev.preventDefault();
            }
          }
        }
        break;
      case "ArrowDown": {
        this.state.selectedIndex =
          this.state.selectedIndex === -1 ||
          this.state.selectedIndex === this.state.linksList.length - 1
            ? 0
            : (this.state.selectedIndex + 1) % this.state.linksList.length;
        this.showSelectedProposal();
        ev.stopPropagation();
        ev.preventDefault();
        break;
      }
      case "ArrowUp": {
        if (this.state.selectedIndex !== -1) {
          this.state.selectedIndex =
            this.state.selectedIndex === 0
              ? this.state.linksList.length - 1
              : (this.state.selectedIndex - 1) % this.state.linksList.length;
          this.showSelectedProposal();
          ev.stopPropagation();
          ev.preventDefault();
        }
        break;
      }
    }
  }

  showSelectedProposal() {
    this.suggestionListRef.el
      ?.querySelector(`.suggestion-item[data-index="${this.state.selectedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
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
