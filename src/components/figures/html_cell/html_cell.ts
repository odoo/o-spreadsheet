import { Border, BorderDescr, CellPosition, CSSProperties, Zone } from "../../..";
import { computeTextFontSizeInPixels } from "../../../helpers/text_helper";
import { Component } from "../../../owl3_compatibility_layer";
import { CellClickableItem } from "../../../registries/cell_clickable_registry";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { ClickableCellsStore } from "../../dashboard/clickable_cell_store";
import { cellStyleToCss, cssPropertiesToCss } from "../../helpers/css";
import { HTMLIcon } from "../html_icon/html_icon";

interface Props {
  position: CellPosition;
  hovered: boolean;
  boundingZone: Zone;
  onMouseEnter: (position: CellPosition) => void;
  onMouseLeave: (position: CellPosition) => void;
}

export class HTMLCell extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HTMLCell";
  static props = {
    position: Object,
    hovered: Boolean,
    boundingZone: Object,
    onMouseEnter: Function,
    onMouseLeave: Function,
  };
  static components = { HTMLIcon };

  clickableCellsStore!: Store<ClickableCellsStore>;

  setup(): void {
    this.clickableCellsStore = this.env.getStore(ClickableCellsStore);
  }

  get content(): string {
    return this.env.model.getters.getEvaluatedCell(this.props.position).formattedValue;
  }

  get containerStyle(): string {
    const style = this.env.model.getters.getCellComputedStyle(this.props.position);

    const cssProperties: CSSProperties = {
      ...cellStyleToCss(style),
      ...this.borderToCss(this.getBordersToDraw(this.props.position)),
    };
    if (style.fontSize) {
      cssProperties["font-size"] = `${computeTextFontSizeInPixels(style)}px`;
    }
    return cssPropertiesToCss(cssProperties);
  }

  get isClickable(): boolean {
    return !this.env.isDashboard() || !!this.clickableCell;
  }

  get contentClass(): string {
    const align = this.env.model.getters.getComputedCellAlign(this.props.position, false);
    if (align === "left") {
      return "justify-content-start";
    } else if (align === "right") {
      return "justify-content-end";
    } else {
      return "justify-content-center";
    }
  }

  /** Only draw bottom-right borders if we're not on the edge of the rendered zone */
  getBordersToDraw(position: CellPosition): Border {
    const top =
      position.row === this.props.boundingZone.top ? this.getBorder(position, "top") : undefined;
    const left =
      position.col === this.props.boundingZone.left ? this.getBorder(position, "left") : undefined;
    const bottom = this.getBorder(position, "bottom");
    const right = this.getBorder(position, "right");
    return { top, left, bottom, right };
  }

  getBorder(
    position: CellPosition,
    side: "top" | "bottom" | "left" | "right"
  ): BorderDescr | undefined {
    const border = this.env.model.getters.getCellComputedBorder(position);
    if (border?.[side]) {
      return border[side];
    }
    // If the cell doesn't have a border on this side, check if the adjacent cell has a border on the opposite side
    const adjacentPosition = { ...position };
    if (side === "top" && position.row > 0) {
      adjacentPosition.row -= 1;
      return this.env.model.getters.getCellComputedBorder(adjacentPosition)?.bottom;
    } else if (side === "left" && position.col > 0) {
      adjacentPosition.col -= 1;
      return this.env.model.getters.getCellComputedBorder(adjacentPosition)?.right;
    } else if (side === "bottom") {
      adjacentPosition.row += 1;
      return this.env.model.getters.getCellComputedBorder(adjacentPosition)?.top;
    } else if (side === "right") {
      adjacentPosition.col += 1;
      return this.env.model.getters.getCellComputedBorder(adjacentPosition)?.left;
    }
    return undefined;
  }

  borderToCss(border: Border | null): CSSProperties {
    if (!border) {
      return {};
    }
    const properties: CSSProperties = {};
    for (const side in border) {
      const borderDescr = border[side as keyof Border];
      if (!borderDescr) {
        continue;
      }
      const descr = this.borderDescrToCss(borderDescr);
      properties[`border-${side}`] = `${descr.width} ${descr.style} ${descr.color}`;
    }

    return properties;
  }

  borderDescrToCss(borderDescr: BorderDescr) {
    switch (borderDescr.style) {
      case "dashed":
        return {
          style: "dashed",
          color: borderDescr.color,
          width: `1px`,
        };
      case "dotted":
        return {
          style: "dotted",
          color: borderDescr.color,
          width: `1px`,
        };
      case "thin":
        return {
          style: "solid",
          color: borderDescr.color,
          width: `1px`,
        };
      case "medium":
        return {
          style: "solid",
          color: borderDescr.color,
          width: `2px`,
        };
      case "thick":
        return {
          style: "solid",
          color: borderDescr.color,
          width: `3px`,
        };
    }
  }

  get dataBarBackgroundStyle(): string {
    const dataBar = this.env.model.getters.getConditionalDataBar(this.props.position);
    if (!dataBar || dataBar.percentage <= 0) {
      return "";
    }
    return cssPropertiesToCss({
      width: `${Math.round(dataBar.percentage)}%`,
      background: dataBar.color,
    });
  }

  get icons() {
    const iconsList = this.env.model.getters.getCellIcons(this.props.position);
    return {
      left: iconsList.find((icon) => icon?.horizontalAlign === "left"),
      right: iconsList.find((icon) => icon?.horizontalAlign === "right"),
      center: iconsList.find((icon) => icon?.horizontalAlign === "center"),
    };
  }

  get clickableCell(): CellClickableItem | undefined {
    if (!this.env.isDashboard()) {
      return undefined;
    }
    // ADRM TODO: kinda hack the store (: in any case this absolutely need to be cached
    return this.clickableCellsStore.clickableCellsGetter.get(this.props.position);
  }

  onMouseDown(ev: MouseEvent): void {
    if (ev.button === 0 && this.isClickable) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  onClick(): void {
    if (!this.env.isDashboard()) {
      const activeSheetId = this.env.model.getters.getActiveSheetId();
      if (this.props.position.sheetId !== activeSheetId) {
        this.env.model.dispatch("ACTIVATE_SHEET", {
          sheetIdFrom: activeSheetId,
          sheetIdTo: this.props.position.sheetId,
        });
      }
      this.env.model.selection.selectCell(this.props.position.col, this.props.position.row);
      return;
    }
    this.clickableCell?.execute(this.props.position, this.env);
  }

  get title(): string | undefined {
    const clickableCell = this.clickableCell;
    if (!clickableCell) {
      return undefined;
    }

    return typeof clickableCell.title === "function"
      ? clickableCell.title(this.props.position, this.env.model.getters)
      : clickableCell.title;
  }

  get clickableCellProps() {
    return this.clickableCell?.componentProps?.(this.props.position, this.env.model.getters) ?? {};
  }
}
