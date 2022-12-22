import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import {
  ComponentsImportance,
  DEFAULT_CELL_HEIGHT,
  SELECTION_BORDER_COLOR,
} from "../../../constants";
import { fontSizeMap } from "../../../fonts";
import { positionToZone } from "../../../helpers";
import { ComposerSelection, EditionMode } from "../../../plugins/ui/edition";
import { DOMDimension, Rect, SpreadsheetChildEnv } from "../../../types/index";
import { getTextDecoration } from "../../helpers";
import { css } from "../../helpers/css";
import { Composer } from "../composer/composer";
import { Style } from "./../../../types/misc";

const COMPOSER_BORDER_WIDTH = 3 * 0.4 * window.devicePixelRatio || 1;
css/* scss */ `
  div.o-grid-composer {
    z-index: ${ComponentsImportance.Composer};
    box-sizing: border-box;
    position: absolute;
    border: ${COMPOSER_BORDER_WIDTH}px solid ${SELECTION_BORDER_COLOR};
  }
`;

interface ComposerProps {
  rect: Rect;
  delimitation: DOMDimension;
}

interface Props {
  focus: "inactive" | "cellFocus" | "contentFocus";
  content: string;
  onComposerContentFocused: (selection: ComposerSelection) => void;
  onComposerCellFocused: () => void;
}

/**
 * This component is a composer which positions itself on the grid at the anchor cell.
 * It also applies the style of the cell to the composer input.
 */
export class GridComposer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridComposer";
  static components = { Composer };

  // private rect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  private state: { rect: Rect; mode: EditionMode } = useState({
    rect: this.defaultRect,
    mode: "inactive",
  });

  get defaultRect() {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  setup() {
    onWillUpdateProps(() => {
      const newMode = this.env.model.getters.getEditionMode();
      if (this.state.mode !== newMode) {
        this.state.mode = newMode;
        if (newMode === "inactive") {
          this.state.rect = this.defaultRect;
          return;
        }
        const position = this.env.model.getters.getPosition();
        const zone = this.env.model.getters.expandZone(
          this.env.model.getters.getActiveSheetId(),
          positionToZone(position)
        );
        this.state.rect = this.env.model.getters.getVisibleRect(zone);
      }
    });
  }

  get composerProps(): ComposerProps {
    const { width, height } = this.env.model.getters.getSheetViewDimensionWithHeaders();
    return {
      // TODO: rect is used as a prop to compute the child formula assistant position
      // Only delimitation should exist. the rect should probably be self handled by the child
      rect: { ...this.state.rect },
      delimitation: {
        width,
        height,
      },
    };
  }

  get containerStyle(): string {
    if (this.env.model.getters.getEditionMode() === "inactive") {
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
    const { x: left, y: top, width, height } = this.state.rect;

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

    const maxWidth = sheetDimensions.width - this.state.rect.x;
    const maxHeight = sheetDimensions.height - this.state.rect.y;

    // TODO investigate +-1 px offset ...
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
