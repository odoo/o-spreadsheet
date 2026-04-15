import { Component } from "@odoo/owl";
import { MIN_CELL_TEXT_MARGIN } from "../../../constants";
import { computeTextFontSizeInPixels } from "../../../helpers";
import { Border, CellPosition, CSSProperties } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { cellStyleToCss, cssPropertiesToCss } from "../../helpers";

interface Props {
  position: CellPosition;
}

export class HTMLCell extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HTMLCell";
  static props = {
    position: Object,
  };
  static components = {};

  get content(): string {
    return this.env.model.getters.getEvaluatedCell(this.props.position).formattedValue;
  }

  get style(): string {
    const style = this.env.model.getters.getCellComputedStyle(this.props.position);
    const fontSize = computeTextFontSizeInPixels(style);
    const properties = cellStyleToCss(style);
    // const { sheetId, row, col } = this.props.position;
    // const width = this.env.model.getters.getColSize(sheetId, col);
    // const height = this.env.model.getters.getRowSize(sheetId, row);
    const align = this.env.model.getters.getComputedCellAlign(this.props.position, false);
    const verticalAlign = style.verticalAlign || "bottom";
    return cssPropertiesToCss({
      ...properties,
      color: style.textColor || "black",
      // width: `${width}px`,
      // height: `${height}px`,
      "font-size": `${fontSize}px`,
      "justify-content": align === "left" ? "start" : align === "right" ? "end" : "center",
      "align-items":
        verticalAlign === "top" ? "start" : verticalAlign === "bottom" ? "end" : "center",
      padding: `0 ${MIN_CELL_TEXT_MARGIN}px`,
      ...this.borderToCss(this.env.model.getters.getCellComputedBorder(this.props.position)),
    });
  }

  borderToCss(border: Border | null): CSSProperties {
    // ADRM TODO: don't draw borders twice
    if (!border || +1 + 1) {
      return {};
    }
    const properties: CSSProperties = {};
    for (const side in border) {
      const borderDescr = border[side as keyof Border];
      if (!borderDescr) {
        continue;
      }
      properties[`border-${side}-color`] = borderDescr?.color || "black";
      properties[`border-${side}-width`] = borderDescr ? `1px` : "0";
      properties[`border-${side}-style`] = borderDescr ? "solid" : "none";
    }

    return properties;
  }

  get dataBarBackgroundStyle(): string {
    const dataBar = this.env.model.getters.getConditionalDataBar(this.props.position);
    if (!dataBar || dataBar.percentage <= 0) {
      return "";
    }
    return cssPropertiesToCss({
      width: `${dataBar.percentage}%`,
      background: dataBar.color,
    });
  }
}
