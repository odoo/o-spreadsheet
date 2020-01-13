import * as owl from "@odoo/owl";
import { GridModel, Highlight, Zone } from "./grid_model";
import { tokenize } from "./expressions";
import { toCartesian } from "./helpers";
import { fontSizeMap } from "./fonts";

const { Component } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
    <div class="o-composer" t-att-style="style"
      contenteditable="true"
      t-on-input="onInput"
      t-on-keydown="onKeydown" 
      t-on-click="onClick"/>
  `;

const CSS = css/* scss */ `
  .o-composer {
    box-sizing: border-box;
    position: absolute;
    border: 1.4px solid #3266ca;
    font-family: arial;
    padding: 2px;
    padding-top: 3px;
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

  constructor() {
    super(...arguments);
    const model = this.model;
    if (model.activeXc in model.mergeCellMap) {
      this.zone = model.merges[model.mergeCellMap[model.activeXc]];
    } else {
      const { activeCol, activeRow } = model;
      this.zone = { left: activeCol, top: activeRow, right: activeCol, bottom: activeRow };
    }
  }
  mounted() {
    const el = this.el as HTMLInputElement;
    el.innerHTML = this.model.currentContent;
    const { cols } = this.model;
    const width = cols[this.zone.right].right - cols[this.zone.left].left;
    el.style.width = (width + 1.5) as any;
    el.style.width = Math.max(el.scrollWidth + 2, width + 1.5) as any;

    el.focus();
    el.style.width = (width + 1) as any;
    el.style.width = Math.max(el.scrollWidth + 3, width + 1) as any;

    const range = document.createRange(); //Create a range (a range is a like the selection but invisible)
    range.selectNodeContents(el); //Select the entire contents of the element with the range
    range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
    const sel = window.getSelection()!; //get the selection object (allows you to change selection)
    sel.removeAllRanges(); //remove any selections already made
    sel.addRange(range); //make

    this.addHighlights();
  }

  willUnmount() {
    this.model.removeAllHighlights();
  }

  get style() {
    const { cols, rows, offsetX, offsetY } = this.model;
    const col = cols[this.zone.left];
    const row = rows[this.zone.top];
    const height = rows[this.zone.bottom].bottom - row.top + 2;
    const top = row.top - offsetY - 1;
    const cell = this.model.selectedCell || { type: "text" };
    const style = this.model.getStyle();
    const weight = `font-weight:${style.bold ? "bold" : 500};`;
    const sizeInPt = style.fontSize || 10;
    const size = fontSizeMap[sizeInPt];
    const italic = style.italic ? `font-style: italic;` : ``;
    const strikethrough = style.strikethrough ? `text-decoration:line-through;` : ``;
    const align = "align" in style ? style.align : cell.type === "number" ? "right" : "left";
    const position =
      align === "left"
        ? `left: ${col.left - offsetX}px;`
        : `right: ${this.model.clientWidth - (cols[this.zone.right].right - offsetX)}px;`;
    return `${position}top:${top}px;height:${height};text-align:${align};font-size:${size}px;${weight}${italic}${strikethrough}`;
  }

  onInput() {
    // write in place? or go through a method probably
    const el = this.el as HTMLInputElement;
    this.model.currentContent = el.innerText;
    if (el.clientWidth !== el.scrollWidth) {
      el.style.width = (el.scrollWidth + 20) as any;
    }
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this.model.movePosition(0, 1);
    }
    if (ev.key === "Escape") {
      this.model.cancelEdition();
    }
    if (ev.key === "Tab") {
      ev.preventDefault();
      const deltaX = ev.shiftKey ? -1 : 1;
      this.model.movePosition(deltaX, 0);
    }
  }

  onClick(ev: MouseEvent) {
    const el = this.el as HTMLElement;
    let value = el.innerText;

    if (value.startsWith("=")) {
      const tokens = tokenize(value);
      let selection = window.getSelection();

      if (selection) {
        const start = selection.anchorOffset;
        const end = selection.focusOffset;
        if (start === end) {
          // there is no selection
          let found = tokens.find(
            t =>
              t.type === "VARIABLE" &&
              t.start <= selection!.anchorOffset! &&
              t.end >= selection!.focusOffset!
          );
          if (found) {
            //el.setSelectionRange(found.start, found.end, "forward");
            selection.removeAllRanges();
            let range = document.createRange();
            range.setStart(this.el!.childNodes[0] as Node, found.start);
            range.setEnd(this.el!.childNodes[0] as Node, found.end);
            selection.addRange(range);
          }
        }
      }
    }
  }

  addHighlights() {
    const el = this.el as HTMLElement;
    let value = el.innerText;
    if (value.startsWith("=")) {
      const tokens = tokenize(value);
      // there is no selection
      let variables = tokens.filter(t => t.type === "VARIABLE");
      if (variables) {
        let highlights: Highlight[] = variables.map(v => {
          const ranges = v.value.split(":");
          let top, bottom, left, right;
          if (ranges.length === 1) {
            let c = toCartesian(v.value);
            left = right = c[0];
            top = bottom = c[1];
          }

          return {
            zone: { top, bottom, left, right },
            color: "pink"
          };
        });

        this.model.addHighlights(highlights);
      }
    }
  }
}
