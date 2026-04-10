import { ComponentConstructor } from "../owl3_compatibility_layer";

/**
 * Return the prop's type of a component
 */
export type PropsOf<C> = C extends ComponentConstructor<infer Props> ? Props : never;
