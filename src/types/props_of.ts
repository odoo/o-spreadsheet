import { GetPropsWithOptionals } from "@odoo/owl";

/**
 * Return the prop's type of a component as seen from the caller (pre-default
 * shape). Strips the owl3 `Props<...>` / `PropsWithDefaults<...>` brand and
 * makes props with a default value optional for the caller. If the field is
 * not a `Props<...>` brand (e.g. typed with a plain interface), returns it
 * as-is instead of `never`.
 */
export type PropsOf<C extends { [key: string]: any }, Key extends string = "props"> = [
  GetPropsWithOptionals<C[Key]>
] extends [never]
  ? C[Key]
  : GetPropsWithOptionals<C[Key]>;
