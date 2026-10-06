import { usePlugin } from "@odoo/owl";
import { useStore } from "../../../store_engine/store_hooks";
import { ZoomStore } from "../../../stores/zoom_store";
import { FigureUI } from "../../../types/figure";
import { cssPropertiesToCss, rectToCss } from "../../helpers/css";
import { OSComponent } from "../../os_component";
import { FigureComponent } from "../figure/figure";
import { DraggedFigurePlugin } from "./figure_dnd_owl_plugin";

export class FiguresDragAndDropContainer extends OSComponent {
  static template = "o-spreadsheet-FiguresDragAndDropContainer";
  static components = { FigureComponent };

  figureDndPlugin = usePlugin(DraggedFigurePlugin);
  private zoomStore = useStore(ZoomStore);

  get draggedFigures(): FigureUI[] {
    return this.figureDndPlugin.dnd.selectedFigures || [];
  }

  get containerStyle() {
    return cssPropertiesToCss({
      ...rectToCss(this.figureDndPlugin.containerRect),
      zoom: String(this.zoomStore.zoomLevel),
    });
  }
}
