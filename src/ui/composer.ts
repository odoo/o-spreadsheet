import * as owl from "@odoo/owl";
import { GridModel, Zone } from "../model";
import { tokenize, Token } from "../formulas/index";
import { toCartesian, zoneToXC } from "../helpers";
import { fontSizeMap } from "../fonts";
import { ContentEditableHelper } from "./contentEditableHelper";

const { Component } = owl;
const { xml, css } = owl.tags;

export const colors = [
  "#0074d9",
  "#7fdbff",
  "#39cccc",
  "#3d9970",
  "#0ecc40",
  "#01ff70",
  "#ffdc00",
  "#ff851b",
  "#ff4136",
  "#85144b",
  "#f012be",
  "#b10dc9",
  "#111111",
  "#aaaaaa",
  "#dddddd",
  "#001f3f"
];

const TEMPLATE = xml/* xml */ `
    <div class="o-composer" t-att-style="style" tabindex="1"
      contenteditable="true"
      spellcheck="false"
      t-on-input="onInput"
      t-on-keydown="onKeydown"
      t-on-blur="onBlur" 
      t-on-click="onClick"
      />
  `;

const CSS = css/* scss */ `
  .o-composer {
    box-sizing: border-box;
    position: absolute;
    border: 1.5px solid #3266ca;
    font-family: arial;
    padding-left: 2px;
    padding-right: 4px;
    background-color: white;
    white-space: nowrap;
    &:focus {
      outline: none;
    }
  }
`;

export class Composer extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;
  model: GridModel = this.props.model;
  zone: Zone;
  selectionEnd: number = 0;
  selectionStart: number = 0;
  // a composer edits a single cell. After that, it is done and should not
  // modify the model anymore.
  isDone: boolean = false;
  contentHelper: ContentEditableHelper;

  constructor() {
    super(...arguments);
    const model = this.model;
    this.contentHelper = new ContentEditableHelper(this.el);
    if (model.state.activeXc in model.state.mergeCellMap) {
      this.zone = model.state.merges[model.state.mergeCellMap[model.state.activeXc]];
    } else {
      const { activeCol, activeRow } = model.state;
      this.zone = { left: activeCol, top: activeRow, right: activeCol, bottom: activeRow };
    }
  }

  mounted() {
    const el = this.el! as HTMLElement;
    this.contentHelper.updateEl(el);

    // @ts-ignore
    //TODO VSC: remove this debug code
    window.composer = el;
    const { cols } = this.model.state;

    this.processContent();

    if (this.model.state.currentContent) {
      this.contentHelper.selectRange(
        this.model.state.currentContent.length,
        this.model.state.currentContent.length
      );
    }

    const width = cols[this.zone.right].right - cols[this.zone.left].left;
    el.style.width = (width + 1.5) as any;
    el.style.width = Math.max(el.scrollWidth + 2, width + 1.5) as any;

    el.style.width = (width + 1.5) as any;
    el.style.width = Math.max(el.scrollWidth + 3, width + 1.5) as any;
  }

  willUnmount(): void {
    this.trigger("composer-unmounted");
  }

  addTextFromSelection() {
    this.contentHelper.selectRange(this.selectionStart, this.selectionEnd);
    let newValue = zoneToXC(this.model.state.selection.zones[0]);
    this.contentHelper.insertText(newValue);
    this.contentHelper.selectRange(this.selectionStart, this.selectionStart + newValue.length);
    this.selectionEnd = this.selectionStart + newValue.length - 1;
  }

  findTokenAtPosition(start: number, end: number): Token | void {
    const el = this.el as HTMLElement;
    let value = el.innerText;
    if (value.startsWith("=")) {
      const tokens = tokenize(value);
      return tokens.find(t => t.start <= start! && t.end >= end!);
    }
  }

  get style() {
    const { cols, rows, offsetX, offsetY } = this.model.state;
    const col = cols[this.zone.left];
    const row = rows[this.zone.top];
    const height = rows[this.zone.bottom].bottom - row.top + 2;
    const top = row.top - offsetY - 1;
    const cell = this.model.selectedCell || { type: "text" };
    const style = this.model.style;
    const weight = `font-weight:${style.bold ? "bold" : 500};`;
    const sizeInPt = style.fontSize || 10;
    const size = fontSizeMap[sizeInPt];
    const italic = style.italic ? `font-style: italic;` : ``;
    const strikethrough = style.strikethrough ? `text-decoration:line-through;` : ``;
    const align = "align" in style ? style.align : cell.type === "number" ? "right" : "left";
    const position =
      align === "left"
        ? `left: ${col.left - offsetX}px;`
        : `right: ${this.model.state.clientWidth - (cols[this.zone.right].right - offsetX) - 2}px;`;
    return `${position}top:${top}px;height:${height};line-height:${height -
      1}px;text-align:${align};font-size:${size}px;${weight}${italic}${strikethrough}`;
  }

  onInput() {
    if (this.isDone) {
      return;
    }
    // write in place? or go through a method probably
    const el = this.el as HTMLInputElement;
    if (el.clientWidth !== el.scrollWidth) {
      el.style.width = (el.scrollWidth + 20) as any;
    }
    if (this.el!.childNodes.length) {
      this.model.state.currentContent = (this.el! as Node).textContent!;
    } else {
      this.model.state.currentContent = "";
    }

    if (this.model.state.currentContent.startsWith("=")) {
      this.model.state.isSelectingRange = true;
    }
  }

  onKeydown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        this.model.stopEditing();
        this.model.movePosition(0, ev.shiftKey ? -1 : 1);
        this.isDone = true;
        break;
      case "Escape":
        this.model.cancelEdition();
        this.isDone = true;
        break;
      case "Tab":
        ev.preventDefault();
        const deltaX = ev.shiftKey ? -1 : 1;
        this.isDone = true;
        this.model.movePosition(deltaX, 0);
        break;
    }
  }

  onClick(ev: MouseEvent) {
    ev.stopPropagation();
    this.model.state.isSelectingRange = false;
    // const selection = this.contentHelper.getCurrentSelection();
    // if (selection.start === selection.end) {
    //   let found = this.findTokenAtPosition(selection.start, selection.end);
    //   if (found && found.type === "VARIABLE") {
    //     this.contentHelper.selectRange(found.start, found.end);
    //     this.model.state.isSelectingRange = true;
    //   }
    // }
  }

  onBlur(ev: FocusEvent) {
    const selection = this.contentHelper.getCurrentSelection();
    console.log("getCurrentSelection: ", selection);
    this.selectionStart = selection.start;
    this.selectionEnd = selection.end;
  }

  processContent() {
    let value = this.model.state.currentContent;
    if (value.startsWith("=")) {
      let lastUsedColorIndex = 0;
      const tokens = tokenize(value);
      const rangesUsed = {};
      for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];

        // there is no selection
        switch (token.type) {
          case "FUNCTION":
            this.contentHelper.insertText(token.value);
            break;
          case "VARIABLE":
            let value = token.value.trim();
            if (
              tokens.length >= i + 2 && // there is at least an operator and another token
              tokens[i + 1].type === "OPERATOR" &&
              tokens[i + 1].value === ":" &&
              tokens[i + 2].type === "VARIABLE"
            ) {
              value += ":" + tokens[i + 2].value;
              i += 2;
            }

            if (!rangesUsed[value]) {
              rangesUsed[value] = colors[lastUsedColorIndex];
              lastUsedColorIndex = ++lastUsedColorIndex % colors.length;
            }
            this.contentHelper.insertText(value, rangesUsed[value]);

            break;

          default:
            this.contentHelper.insertText(token.value);
            break;
        }
      }

      let highlights = Object.keys(rangesUsed).map(r1c1 => {
        const ranges = r1c1.split(":");
        let top, bottom, left, right;
        let c = toCartesian(ranges[0]);
        left = right = c[0];
        top = bottom = c[1];
        if (ranges.length === 2) {
          let d = toCartesian(ranges[1]);
          right = d[0];
          bottom = d[1];
        }
        return { zone: { top, bottom, left, right }, color: rangesUsed[r1c1] };
      });

      this.model.addHighlights(highlights);
    } else {
      this.contentHelper.insertText(this.model.state.currentContent);
    }
  }
}
