import { ComponentConstructor } from "@odoo/owl";

/**
 * Return the prop's type of a component
 */
export type PropsOf<C> = C extends ComponentConstructor<infer Props> ? Props : never;
