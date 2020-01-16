import * as owl from "@odoo/owl";

import { Grid } from "./grid";
import { GridModel, GridData } from "../model/index";
import { ToolBar } from "./toolbar";

const { Component } = owl;
const { useRef, useExternalListener } = owl.hooks;
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
    grid-template-rows: 36px auto;
  }
`;

interface Props {
  data: GridData;
}
export class Spreadsheet extends Component<any, Props> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { ToolBar, Grid };

  model = new GridModel(this.props.data);
  grid = useRef("grid");

  constructor() {
    super(...arguments);
    useExternalListener(window as any, "resize", this.render);
  }

  mounted() {
    this.model.on("update", this, this.render);
  }

  willUnmount() {
    this.model.off("update", this);
  }

  focusGrid() {
    (<any>this.grid.comp).focus();
  }
}
