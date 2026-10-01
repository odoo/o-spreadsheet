import { usePlugin } from "@odoo/owl";
import { FigureUI } from "../../../types/figure";
import { OSComponent } from "../../os_component";
import { FigureComponent } from "../figure/figure";
import { DraggedFigurePlugin } from "./figure_dnd_owl_plugin";

export class FiguresDragAndDropContainer extends OSComponent {
  static template = "o-spreadsheet-FiguresDragAndDropContainer";
  static components = { FigureComponent };

  figureDndPlugin = usePlugin(DraggedFigurePlugin);

  get draggedFigures(): FigureUI[] {
    return this.figureDndPlugin.dnd.selectedFigures || [];
  }
}
