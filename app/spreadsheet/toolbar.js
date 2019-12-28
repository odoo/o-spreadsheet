const { Component } = owl;
const { xml, css } = owl.tags;

const GRAY_COLOR = "#f5f5f5";
// -----------------------------------------------------------------------------
// ToolBar
// -----------------------------------------------------------------------------
export class ToolBar extends Component {
  static template = xml/* xml */ `
    <div class="o-spreadsheet-toolbar">
      <div class="o-cell-content">
         <t t-esc="props.state.selectedCell and props.state.selectedCell.content"/>
      </div>
      <div class="o-buttons">
        <span class="o-button">Undo</span>
        <span class="o-button">Redo</span>
      </div>
    </div>`;
  static style = css/* css */ `
    .o-spreadsheet-toolbar {
      background-color: ${GRAY_COLOR};
      border-bottom: 1px solid #ccc;
      display: flex;
      height: 31px;
      line-height: 31px;

      .o-cell-content {
        font-family: arial;
        color: #222;
        padding: 0 8px;
        flex: 0 0 200px;
        margin: 3px;
        border: 1px solid #ddd;
        line-height: 25px;
      }

      .o-buttons {
        flex: 1 1 auto;
        font-size: 13px;

        .o-button {
          margin: 4px;
        }
      }
    }
  `;
}
