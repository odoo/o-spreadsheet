import * as owl from "@odoo/owl";
import { GridModel, Highlight } from "./grid_model";
import { tokenize } from "./expressions";
import { toCartesian } from "./helpers";

const { Component } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
    <input class="o-composer" t-att-style="style"
      t-on-input="onInput"
      t-on-keydown="onKeydown" 
      t-on-click="onClick"/>
  `;

const CSS = css/* scss */ `
  .o-composer {
    position: absolute;
    border: 1.2px solid #4b89ff;
    font-family: arial;
    font-size: 12px;
    padding: 2px;
    padding-left: 3px;
  }
  .o-composer:focus {
    outline: none;
  }
`;

export class Composer extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;
  model: GridModel = this.props.model;

  mounted() {
    const el = this.el as HTMLInputElement;
    el.value = this.model.currentContent;
    const { cols, selection } = this.model;
    const col = cols[selection.left];
    el.style.width = (col.size + 1.5) as any;
    el.style.width = Math.max(el.scrollWidth + 2, col.size + 1.5) as any;

    this.addHighlights();

    el.focus();
  }

  onWillUnmount() {
    this.model.removeAllHighlights();
  }

  get style() {
    const { cols, selection, rows, offsetX, offsetY } = this.model;
    const col = cols[selection.left];
    const row = rows[selection.top];
    const top = row.top - offsetY - 1;
    const height = row.size + 2;
    const cell = this.model.selectedCell || { type: "text" };
    const style = this.model.getStyle();
    const weight = `font-weight:${style.bold ? "bold" : 500};`;
    const italic = style.italic ? `font-style: italic;` : ``;
    const strikethrough = style.strikethrough ? `text-decoration:line-through;` : ``;
    const align = "align" in style ? style.align : cell.type === "number" ? "right" : "left";
    const position =
      align === "left"
        ? `left: ${col.left - offsetX - 1}px;`
        : `right: ${this.model.clientWidth - (col.right - offsetX) - 1}px;`;
    return `${position}top:${top}px;height:${height};text-align:${align};${weight}${italic}${strikethrough}`;
  }

  onInput() {
    // write in place? or go through a method probably
    const el = this.el as HTMLInputElement;
    this.model.currentContent = el.value;
    if (el.clientWidth !== el.scrollWidth) {
      el.style.width = (el.scrollWidth + 50) as any;
    }
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this.model.moveSelection(0, 1);
    }
    if (ev.key === "Escape") {
      this.model.cancelEdition();
    }
    if (ev.key === "Tab") {
      ev.preventDefault();
      const deltaX = ev.shiftKey ? -1 : 1;
      this.model.moveSelection(deltaX, 0);
    }
  }

  onClick(ev: MouseEvent) {
    const el = this.el as HTMLInputElement;
    if (el.value.startsWith("=")) {
      const tokens = tokenize(el.value.substr(1));

      if (el.selectionStart && el.selectionStart === el.selectionEnd) {
        // there is no selection
        let found = tokens.find(
          t => t.type === "VARIABLE" && t.start <= el.selectionStart! && t.end >= el.selectionEnd!
        );
        if (found) {
          el.setSelectionRange(found.start, found.end, "forward");
        }
      }
    }
  }

  addHighlights() {
    const el = this.el as HTMLInputElement;

    if (el.value.startsWith("=")) {
      const tokens = tokenize(el.value.substr(1));

      if (el.selectionStart && el.selectionStart === el.selectionEnd) {
        // there is no selection
        let variables = tokens.filter(t => t.type === "VARIABLE");
        if (variables) {
          let hightlights: Highlight[] = variables.map(v => {
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

          this.model.addHighlights(hightlights);
        }
      }
    }
  }
}
