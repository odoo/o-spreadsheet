import { proxy, useProps, xml } from "@odoo/owl";
import { clip } from "../../helpers/misc";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { ViewportsStore } from "../../stores/viewports_store";
import { HeaderIndex } from "../../types/misc";
import { DOMCoordinates } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { cssPropertiesToCss } from "../helpers/css";
import { useDragAndDropBeyondTheViewport } from "../helpers/drag_and_drop_grid_hook";
import { withZoom } from "../helpers/zoom";
import { types } from "../props_validation";
import { AutofillStore } from "./autofill_store";
import { TableAutofillStore } from "./table_autofill_store";

// -----------------------------------------------------------------------------
// Autofill
// -----------------------------------------------------------------------------

interface State {
  position: DOMCoordinates;
  handler: boolean;
}

export class Autofill extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Autofill";

  protected props = useProps({
    position: types.DOMCoordinates(),
    isVisible: types.boolean(),
  });
  state: State = proxy({
    position: { x: 0, y: 0 },
    handler: false,
  });

  dragNDropGrid = useDragAndDropBeyondTheViewport(this.env);
  private viewStore!: Store<ViewportsStore>;
  private autofillStore!: Store<AutofillStore>;

  setup(): void {
    this.viewStore = useStore(ViewportsStore);
    this.autofillStore = useStore(AutofillStore);
    useStore(TableAutofillStore);
  }

  get style() {
    const { x, y } = this.props.position;
    return cssPropertiesToCss({
      top: `${y}px`,
      left: `${x}px`,
      visibility: this.props.isVisible ? "visible" : "hidden",
    });
  }
  get handlerStyle() {
    const { x, y } = this.state.handler ? this.state.position : this.props.position;
    return cssPropertiesToCss({
      top: `${y}px`,
      left: `${x}px`,
    });
  }

  get styleNextValue() {
    const { x, y } = this.state.position;
    return cssPropertiesToCss({
      top: `${y + 5}px`,
      left: `${x + 15}px`,
    });
  }

  getTooltip() {
    const tooltip = this.autofillStore.tooltip;
    if (tooltip && !tooltip.component) {
      tooltip.component = TooltipComponent;
    }
    return tooltip;
  }

  onMouseDown(ev: PointerEvent) {
    this.state.handler = true;
    const zoomedMouseEvent = withZoom(this.env, ev);
    const zoom = this.viewStore.zoomLevel;
    let lastCol: HeaderIndex | undefined;
    let lastRow: HeaderIndex | undefined;
    const start = {
      x: ev.clientX / zoom - this.props.position.x,
      y: ev.clientY / zoom - this.props.position.y,
    };
    const onMouseUp = () => {
      this.state.handler = false;
      this.state.position = { ...this.props.position };
      this.env.model.dispatch("AUTOFILL");
    };

    const onMouseMove = (col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) => {
      this.state.position = {
        x: ev.clientX / zoom - start.x,
        y: ev.clientY / zoom - start.y,
      };
      if (lastCol !== col || lastRow !== row) {
        const activeSheetId = this.env.model.getters.getActiveSheetId();
        const numberOfCols = this.env.model.getters.getNumberCols(activeSheetId);
        const numberOfRows = this.env.model.getters.getNumberRows(activeSheetId);
        lastCol = col === -1 ? lastCol : clip(col, 0, numberOfCols);
        lastRow = row === -1 ? lastRow : clip(row, 0, numberOfRows);
        if (lastCol !== undefined && lastRow !== undefined) {
          this.env.model.dispatch("AUTOFILL_SELECT", { col: lastCol, row: lastRow });
        }
      }
    };
    this.dragNDropGrid.start(zoomedMouseEvent, onMouseMove, onMouseUp);
  }

  onDblClick() {
    this.env.model.dispatch("AUTOFILL_AUTO");
  }
}

class TooltipComponent extends Component<any> {
  protected props: { content: string } = useProps({
    content: types.string(),
  });
  static template = xml/* xml */ `
    <div t-out="this.props.content"/>
  `;
}
