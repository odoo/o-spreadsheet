const { Component } = owl;
const { xml, css } = owl.tags;

const GRAY_COLOR = "#f5f5f5";
// -----------------------------------------------------------------------------
// ToolBar
// -----------------------------------------------------------------------------
export class ToolBar extends Component {
  static template = xml/* xml */ `<div class="o-spreadsheet-toolbar">toolbar</div>`;
  static style = css/* css */ `
    .o-spreadsheet-toolbar {
      background-color: ${GRAY_COLOR};
      border-bottom: 1px solid #ccc;
    }
  `;
}
