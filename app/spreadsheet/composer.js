const { Component } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
    <input class="o-composer" t-att-style="style"
      t-on-input="onInput"
      t-on-keydown="onKeydown" />
  `;

const CSS = css/* scss */ `
  .o-composer {
    position: absolute;
    border: none;
    font-family: arial;
    font-size: 12px;
  }
  .o-composer:focus {
    outline: none;
  }
`;

export class Composer extends Component {
  static template = TEMPLATE;
  static style = CSS;
  model = this.props.model;

  mounted() {
    this.el.value = this.model.currentContent;
    this.el.focus();
  }

  get style() {
    const { cols, selection, rows, offsetX, offsetY } = this.model;
    const col = cols[selection.left];
    const row = rows[selection.top];
    const left = col.left - offsetX + 2;
    const width = col.size - 4;
    const top = row.top - offsetY + 2;
    const height = row.size - 4;
    const style = this.model.getStyle();
    const weight = `font-weight:${style.bold ? "bold" : 500};`;
    const italic = style.italic ? `font-style: italic;` : ``;
    const strikethrough = style.strikethrough ? `text-decoration:line-through;` : ``;
    return `left:${left}px;top:${top}px;width:${width};height:${height};${weight}${italic}${strikethrough}`;
  }

  onInput() {
    // write in place? or go through a method probably
    this.model.currentContent = this.el.value;
  }

  onKeydown(ev) {
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
}
