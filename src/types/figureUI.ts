import { Figure } from "@odoo/o-spreadsheet-engine/types/figure";
import { DOMCoordinates } from "@odoo/o-spreadsheet-engine/types/rendering";

export interface FigureUI extends DOMCoordinates, Figure {}
