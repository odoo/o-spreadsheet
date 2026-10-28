import { usePlugin } from "@odoo/owl";
import { ZoomPlugin } from "../../../owl_plugins/zoom_plugin";
import { FigureUI } from "../../../types/figure";
import { cssPropertiesToCss, rectToCss } from "../../helpers/css";
import { OSComponent } from "../../os_component";
import { FigureComponent } from "../figure/figure";
import { DraggedFigurePlugin } from "./figure_dnd_owl_plugin";

export class FiguresDragAndDropContainer extends OSComponent {
  static template = "o-spreadsheet-FiguresDragAndDropContainer";
  static components = { FigureComponent };

  figureDndPlugin = usePlugin(DraggedFigurePlugin);
  private zoomPlugin = usePlugin(ZoomPlugin);

  get draggedFigures(): FigureUI[] {
    return this.figureDndPlugin.dnd.selectedFigures || [];
  }

  get containerStyle() {
    return cssPropertiesToCss({
      ...rectToCss(this.figureDndPlugin.containerRect),
      zoom: String(this.zoomPlugin.zoomLevel()),
    });
  }
}
