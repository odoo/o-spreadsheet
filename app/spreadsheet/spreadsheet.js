import { Grid } from "./grid.js";
import { GridModel } from "./grid_model.js";
import { ToolBar } from "./toolbar.js";
import { useExternalListener } from "./helpers.js";

const { Component } = owl;
const { useRef } = owl.hooks;
const { xml, css } = owl.tags;

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet hello FP">
    <ToolBar model="model" t-on-click="focusGrid"/>
    <Grid model="model" t-ref="grid"/>
  </div>`;

const CSS = css/* scss */ `
  .o-spreadsheet {
    display: grid;
    grid-template-rows: 32px auto;
  }
`;

export class Spreadsheet extends Component {
  static template = TEMPLATE;
  static style = CSS;
  static components = { ToolBar, Grid };

  model = new GridModel(this.props.data);
  grid = useRef("grid");

  constructor() {
    super(...arguments);
    useExternalListener(window, "resize", this.render);
  }

  mounted() {
    this.model.on("update", this, this.render);
  }

  willUnmount() {
    this.model.off("update", this);
  }

  focusGrid() {
    this.grid.comp.focus();
  }
}
