/** Converts a union `A | B | C` into an intersection `A & B & C` via function-parameter contravariance. */
export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;
