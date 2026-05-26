import { Props, WithDefaults } from "@odoo/owl";

/**
 * Return the prop's type of a component as seen from the caller (pre-default
 * shape). Strips the owl3 `Props<...>` brand and unwraps `WithDefaults<R, D>`
 * so that props with a default value stay optional for the caller.
 */
export type PropsOf<
  C extends { [key: string]: any },
  Key extends string = "props"
> = C[Key] extends Props<infer P> ? (P extends WithDefaults<infer R, any> ? R : P) : C[Key];
