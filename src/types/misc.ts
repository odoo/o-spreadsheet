// -----------------------------------------------------------------------------
// MISC
// -----------------------------------------------------------------------------

/**
 * Return the prop's type of a component
 */
export type PropsOf<C> = C extends ComponentConstructor<infer Props> ? Props : never;

export type CSSProperties<P extends string = string> = Record<P, string | undefined>;

export interface GridClickModifiers {
  addZone: boolean;
  expandZone: boolean;
}

export type ComposerFocusType = "inactive" | "cellFocus" | "contentFocus";

export type EditionMode =
  | "editing"
  | "selecting" // should tell if you need to underline the current range selected.
  | "inactive";
