const { Component } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
    <input class="o-composer" t-att-style="style" t-model="state.content"/>
  `;

const CSS = css/* scss */ `
  .o-composer {
    position: absolute;
    border: none;
  }
  .o-composer:focus {
    outline: none;
  }
`;

export class Composer extends Component {
  static template = TEMPLATE;
  static style = CSS;

  state = { content: this.props.initialContent };

  mounted() {
    this.el.focus();
  }

  get style() {
    const state = this.props.state;
    const { cols, selectedCol, rows, selectedRow, offsetX, offsetY } = state;
    const col = cols[selectedCol];
    const row = rows[selectedRow];
    const left = col.left - offsetX + 2;
    const width = col.size - 4;
    const top = row.top - offsetY + 2;
    const height = row.size - 4;
    return `left:${left}px;top:${top}px;width:${width};height:${height}`;
  }
}
