const { Component } = owl;
const { xml, css } = owl.tags;

const GRAY_COLOR = "#f5f5f5";
// -----------------------------------------------------------------------------
// ToolBar
// -----------------------------------------------------------------------------
export class ToolBar extends Component {
  static template = xml/* xml */ `
    <div class="o-spreadsheet-toolbar">
      <span class="o-cell-content">
         <t t-esc="props.state.selectedCell and props.state.selectedCell.content"/>
      </span>
    </div>`;
  static style = css/* css */ `
    .o-spreadsheet-toolbar {
      background-color: ${GRAY_COLOR};
      border-bottom: 1px solid #ccc;

      .o-cell-content {
        font-family: Inconsolata,monospace,arial,sans,sans-serif;
        color: #222;
        height: 32px;
        line-height: 32px;
        padding: 0 8px;
      }
    }
  `;
}
