import { GetPropsWithOptionals } from "@odoo/owl";

// Strips symbol-keyed properties so the expanded type doesn't reference
// inaccessible `unique symbol` tokens from @odoo/owl in generated .d.ts files.
type DropSymbolKeys<T> = { [K in keyof T as K extends symbol ? never : K]: T[K] };

/**
 * Return the prop's type of a component as seen from the caller (pre-default
 * shape). Strips the owl3 `Props<...>` / `PropsWithDefaults<...>` brand and
 * makes props with a default value optional for the caller. If the field is
 * not a `Props<...>` brand (e.g. typed with a plain interface), returns it
 * as-is instead of `never`.
 */
export type PropsOf<
  C extends { [key: string]: any },
  Key extends string = "props"
> = DropSymbolKeys<
  [GetPropsWithOptionals<C[Key]>] extends [never] ? C[Key] : GetPropsWithOptionals<C[Key]>
>;
