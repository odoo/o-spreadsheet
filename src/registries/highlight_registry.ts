import { Highlight } from "../types";
import { Registry } from "./registry";

export const highlightRegistry = new Registry<() => Highlight[]>();
