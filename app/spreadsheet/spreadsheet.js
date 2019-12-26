import { Grid } from "./grid.js";
import { GridState } from "./grid_state.js";
import { ToolBar } from "./toolbar.js";

const { Component } = owl;
const { xml, css } = owl.tags;

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet">
    <ToolBar state="state" />
    <Grid state="state" />
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

  state = new GridState(this.props.data);

  constructor() {
    super(...arguments);
    useExternalListener(window, "resize", this.render);
  }

  mounted() {
    this.state.on("update", this, this.render);
  }

  willUnmount() {
    this.state.off("update", this);
  }
}

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

function useExternalListener(target, eventName, handler) {
  const boundHandler = handler.bind(Component.current);

  owl.hooks.onMounted(() => target.addEventListener(eventName, boundHandler));
  owl.hooks.onWillUnmount(() =>
    target.removeEventListener(eventName, boundHandler)
  );
}
