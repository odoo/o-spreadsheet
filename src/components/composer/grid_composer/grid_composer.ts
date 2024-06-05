import { Component, onWillUpdateProps } from "@odoo/owl";
import { ComponentsImportance, SELECTION_BORDER_COLOR } from "../../../constants";
import {
  deepEquals,
  fontSizeInPixels,
  getFullReference,
  positionToZone,
  toXC,
} from "../../../helpers";
import { Store, useStore } from "../../../store_engine";
import { DOMFocusableElementStore } from "../../../stores/DOM_focus_store";
import { DOMDimension, Rect, SpreadsheetChildEnv } from "../../../types/index";
import { getTextDecoration } from "../../helpers";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { Composer, ComposerProps } from "../composer/composer";
import { ComposerStore } from "../composer/composer_store";
import { ComposerFocusStore } from "../composer_focus_store";

const COMPOSER_BORDER_WIDTH = 3 * 0.4 * window.devicePixelRatio || 1;
const GRID_CELL_REFERENCE_TOP_OFFSET = 28;

css/* scss */ `
  div.o-grid-composer {
    z-index: ${ComponentsImportance.GridComposer};
    box-sizing: border-box;
    position: absolute;
    border: ${COMPOSER_BORDER_WIDTH}px solid ${SELECTION_BORDER_COLOR};

    display: flex;
    align-items: center;
  }

  div.o-cell-reference {
    position: absolute;
    z-index: ${ComponentsImportance.GridComposer};
    background: ${SELECTION_BORDER_COLOR};
    color: white;
    font-size: 12px;
    line-height: 14px;
    padding: 6px 7px;
    border-radius: 4px;
  }
`;

interface Props {
  gridDims: DOMDimension;
  onInputContextMenu: (event: MouseEvent) => void;
}

/**
 * This component is a composer which positions itself on the grid at the anchor cell.
 * It also applies the style of the cell to the composer input.
 */
export class GridComposer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridComposer";
  static props = {
    gridDims: Object,
    onInputContextMenu: Function,
  };
  static components = { Composer };

  private rect: Rect = this.defaultRect;
  private isEditing: boolean = false;
  private isCellReferenceVisible: boolean = false;

  private composerStore!: Store<ComposerStore>;
  composerFocusStore!: Store<ComposerFocusStore>;
  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  get defaultRect() {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  setup() {
    this.composerStore = useStore(ComposerStore);
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    onWillUpdateProps(() => {
      this.updateComponentPosition();
      this.updateCellReferenceVisibility();
    });
  }

  get shouldDisplayCellReference(): boolean {
    return this.isCellReferenceVisible;
  }

  get cellReference(): string {
    const { col, row, sheetId } = this.composerStore.currentEditedCell;
    const prefixSheet = sheetId !== this.env.model.getters.getActiveSheetId();
    return getFullReference(
      prefixSheet ? this.env.model.getters.getSheetName(sheetId) : undefined,
      toXC(col, row)
    );
  }

  get cellReferenceStyle(): string {
    const { x: left, y: top } = this.rect;
    return cssPropertiesToCss({
      left: `${left - COMPOSER_BORDER_WIDTH}px`,
      top: `${top - GRID_CELL_REFERENCE_TOP_OFFSET}px`,
    });
  }

  get composerProps(): ComposerProps {
    const { width, height } = this.env.model.getters.getSheetViewDimensionWithHeaders();
    return {
      rect: { ...this.rect },
      delimitation: {
        width,
        height,
      },
      focus: this.composerFocusStore.gridComposerFocus,
      isDefaultFocus: true,
      onComposerContentFocused: () => this.composerFocusStore.focusGridComposerContent(),
      onComposerCellFocused: (content: string) =>
        this.composerFocusStore.focusGridComposerCell(content),
      onInputContextMenu: this.props.onInputContextMenu,
    };
  }

  get containerStyle(): string {
    if (this.composerStore.editionMode === "inactive") {
      return `z-index: -1000;`;
    }
    const isFormula = this.composerStore.currentContent.startsWith("=");
    const cell = this.env.model.getters.getActiveCell();
    const position = this.env.model.getters.getActivePosition();
    const style = this.env.model.getters.getCellComputedStyle(position);

    // position style
    const { x: left, y: top, width, height } = this.rect;

    // color style
    const background = (!isFormula && style.fillColor) || "#ffffff";
    const color = (!isFormula && style.textColor) || "#000000";

    // font style
    const fontSize = (!isFormula && style.fontSize) || 10;
    const fontWeight = !isFormula && style.bold ? "bold" : undefined;
    const fontStyle = !isFormula && style.italic ? "italic" : "normal";
    const textDecoration = !isFormula ? getTextDecoration(style) : "none";

    // align style
    let textAlign = "left";

    if (!isFormula) {
      textAlign = style.align || cell.defaultAlign;
    }

    const maxHeight = this.props.gridDims.height - this.rect.y;
    const maxWidth = this.props.gridDims.width - this.rect.x;

    /**
     * min-size is on the container, not the composer element, because we want to have the same size as the cell by default,
     * including all the paddings/margins of the composer
     *
     * The +-1 are there to include cell borders in the composer sizing/positioning
     */
    return cssPropertiesToCss({
      left: `${left - 1}px`,
      top: `${top}px`,

      "min-width": `${width + 1}px`,
      "min-height": `${height + 1}px`,
      "max-width": `${maxWidth}px`,
      "max-height": `${maxHeight}px`,

      background,
      color,
      "font-size": `${fontSizeInPixels(fontSize)}px`,
      "font-weight": fontWeight,
      "font-style": fontStyle,
      "text-decoration": textDecoration,
      "text-align": textAlign,
    });
  }

  private updateComponentPosition() {
    const isEditing = this.composerStore.editionMode !== "inactive";
    if (this.isEditing !== isEditing) {
      this.isEditing = isEditing;
      if (!isEditing) {
        this.rect = this.defaultRect;
        this.DOMFocusableElementStore.focus();
        return;
      }
      const position = this.env.model.getters.getActivePosition();
      const zone = this.env.model.getters.expandZone(position.sheetId, positionToZone(position));
      this.rect = this.env.model.getters.getVisibleRect(zone);
    }
  }

  private updateCellReferenceVisibility() {
    if (this.composerStore.editionMode === "inactive") {
      this.isCellReferenceVisible = false;
      return;
    }
    if (this.isCellReferenceVisible) {
      return;
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zone = this.env.model.getters.getSelectedZone();
    const rect = this.env.model.getters.getVisibleRect(zone);
    if (!deepEquals(rect, this.rect) || sheetId !== this.composerStore.currentEditedCell.sheetId) {
      this.isCellReferenceVisible = true;
    }
  }

  onFocus() {
    this.composerFocusStore.focusGridComposerContent();
  }
}
