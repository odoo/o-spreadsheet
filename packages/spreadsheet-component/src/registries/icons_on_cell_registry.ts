import { CellPosition, Getters } from "../types";
import { ImageSrc } from "../types/image";
import { Registry } from "./registry";

type ImageSrcCallback = (getters: Getters, position: CellPosition) => ImageSrc | undefined;

/**
 * Registry to draw icons on cells
 */
export const iconsOnCellRegistry = new Registry<ImageSrcCallback>();
