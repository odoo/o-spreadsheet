import { Figure } from "./figure";
import { DOMCoordinates } from "./rendering";

export interface FigureUI extends DOMCoordinates, Figure {}
