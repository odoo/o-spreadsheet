import * as owl from "@odoo/owl";

import { Grid } from "./grid";
import { GridModel } from "../model/index";
import { PartialGridDataWithVersion } from "../model/import_export";
import { TopBar } from "./top_bar";
import { BottomBar } from "./bottom_bar";
import { TOPBAR_HEIGHT, BOTTOMBAR_HEIGHT } from "../constants";

const { Component } = owl;
const { useRef, useExternalListener } = owl.hooks;
const { xml, css } = owl.tags;

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet">
    <TopBar model="model" t-on-click="focusGrid"/>
    <Grid model="model" t-ref="grid"/>
    <BottomBar model="model" />
  </div>`;

const CSS = css/* scss */ `
  .o-spreadsheet {
    display: grid;
    grid-template-rows: ${TOPBAR_HEIGHT}px auto ${BOTTOMBAR_HEIGHT}px;
    * {
      font-family: Roboto, RobotoDraft, Helvetica, Arial, sans-serif;
    }
    &,
    *,
    *:before,
    *:after {
      box-sizing: content-box;
    }
  }

  .o-icon {
    width: 18px;
    height: 18px;
    opacity: 0.6;
  }
`;

interface Props {
  data: PartialGridDataWithVersion;
}
export class Spreadsheet extends Component<any, Props> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { TopBar, Grid, BottomBar };

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
