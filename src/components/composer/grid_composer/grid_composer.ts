import { Component, onWillUpdateProps } from "@odoo/owl";
import {
  ComponentsImportance,
  DEFAULT_CELL_HEIGHT,
  SELECTION_BORDER_COLOR,
} from "../../../constants";
import { fontSizeMap } from "../../../fonts";
import { positionToZone } from "../../../helpers";
import { Rect, SpreadsheetChildEnv } from "../../../types/index";
import { getTextDecoration } from "../../helpers";
import { css } from "../../helpers/css";
import { Composer, ComposerProps } from "../composer/composer";
import { Style } from "./../../../types/misc";

const COMPOSER_BORDER_WIDTH = 3 * 0.4 * window.devicePixelRatio || 1;
css/* scss */ `
  div.o-grid-composer {
    z-index: ${ComponentsImportance.GridComposer};
    box-sizing: border-box;
    position: absolute;
    border: ${COMPOSER_BORDER_WIDTH}px solid ${SELECTION_BORDER_COLOR};
  }
`;

interface Props {
  focus: "inactive" | "cellFocus" | "contentFocus";
  content: string;
  onComposerContentFocused: () => void;
  onComposerCellFocused: () => void;
  onInputContextMenu: (event: MouseEvent) => void;
}

/**
 * This component is a composer which positions itself on the grid at the anchor cell.
 * It also applies the style of the cell to the composer input.
 */
export class GridComposer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridComposer";
  static components = { Composer };

  private rect: Rect | undefined = undefined;
  private isEditing: boolean = false;

  get defaultRect() {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  setup() {
    onWillUpdateProps(() => {
      const isEditing = this.env.model.getters.getEditionMode() !== "inactive";
      if (this.isEditing !== isEditing) {
        this.isEditing = isEditing;
        if (!isEditing) {
          this.rect = undefined;
          this.env.focusableElement.focus();
          return;
        }
        const position = this.env.model.getters.getPosition();
        const zone = this.env.model.getters.expandZone(
          this.env.model.getters.getActiveSheetId(),
          positionToZone(position)
        );
        this.rect = this.env.model.getters.getVisibleRect(zone);
      }
    });
  }

  get composerProps(): ComposerProps {
    const { width, height } = this.env.model.getters.getSheetViewDimensionWithHeaders();
    return {
      rect: this.rect && { ...this.rect },
      delimitation: {
        width,
        height,
      },
      inputStyle: this.composerStyle,
      focus: this.props.focus,
      isDefaultFocus: true,
      onComposerContentFocused: this.props.onComposerContentFocused,
      onComposerCellFocused: this.props.onComposerCellFocused,
      onInputContextMenu: this.props.onInputContextMenu,
    };
  }

  get containerStyle(): string {
    if (this.env.model.getters.getEditionMode() === "inactive" || !this.rect) {
      return `
        position: absolute;
        z-index: -1000;
      `;
    }
    const isFormula = this.env.model.getters.getCurrentContent().startsWith("=");
    const cell = this.env.model.getters.getActiveCell();

    let style: Style = {};
    if (cell) {
      const cellPosition = this.env.model.getters.getCellPosition(cell.id);
      style = this.env.model.getters.getCellComputedStyle(
        cellPosition.sheetId,
        cellPosition.col,
        cellPosition.row
      );
    }

    // position style
    const { x: left, y: top, width, height } = this.rect;

    // color style
    const background = (!isFormula && style.fillColor) || "#ffffff";
    const color = (!isFormula && style.textColor) || "#000000";

    // font style
    const fontSize = (!isFormula && style.fontSize) || 10;
    const fontWeight = !isFormula && style.bold ? "bold" : 500;
    const fontStyle = !isFormula && style.italic ? "italic" : "normal";
    const textDecoration = !isFormula ? getTextDecoration(style) : "none";

    // align style
    let textAlign = "left";

    if (!isFormula) {
      textAlign = style.align || cell?.defaultAlign || "left";
    }
    const sheetDimensions = this.env.model.getters.getSheetViewDimensionWithHeaders();

    const maxWidth = sheetDimensions.width - this.rect.x;
    const maxHeight = sheetDimensions.height - this.rect.y;

    return `
      left: ${left - 1}px;
      top: ${top}px;
      min-width: ${width + 2}px;
      min-height: ${height + 1}px;

      max-width: ${maxWidth}px;
      max-height: ${maxHeight}px;

      background: ${background};
      color: ${color};

      font-size: ${fontSizeMap[fontSize]}px;
      font-weight: ${fontWeight};
      font-style: ${fontStyle};
      text-decoration: ${textDecoration};

      text-align: ${textAlign};
    `;
  }

  get composerStyle(): string {
    return `
      line-height: ${DEFAULT_CELL_HEIGHT}px;
      max-height: inherit;
      overflow: hidden;
    `;
  }
}
