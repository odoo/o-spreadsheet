import { CellPosition, Getters } from "../types";
import { ImageSVG } from "../types/image";
import { Registry } from "./registry";

type ImageSvgCallback = (getters: Getters, position: CellPosition) => ImageSVG | undefined;

/**
 * Registry to draw icons on cells
 */
export const iconsOnCellRegistry = new Registry<ImageSvgCallback>();
