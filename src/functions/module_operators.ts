import { args, toNumber } from "./arguments";
import { FunctionDescription } from "./index";

// -----------------------------------------------------------------------------
// ADD
// -----------------------------------------------------------------------------
export const ADD: FunctionDescription = {
  description: `Sum of two numbers`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["NUMBER"],
  compute: function(a: number, b: number): number {
    return toNumber(a) + toNumber(b);
  }
};

// -----------------------------------------------------------------------------
// DIVIDE
// -----------------------------------------------------------------------------
export const DIVIDE: FunctionDescription = {
  description: `One number divided by another`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["NUMBER"],
  compute: function(a: number, b: number): number {
    const denom = toNumber(b);
    if (denom === 0) {
      throw new Error("Cannot divide by 0");
    }
    return toNumber(a) / denom;
  }
};

// -----------------------------------------------------------------------------
// EQ
// -----------------------------------------------------------------------------
export const EQ: FunctionDescription = {
  description: `Equality of two numbers`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["BOOLEAN"],
  compute: function(a: number, b: number): boolean {
    return toNumber(a) === toNumber(b);
  }
};

// -----------------------------------------------------------------------------
// GT
// -----------------------------------------------------------------------------
export const GT: FunctionDescription = {
  description: `Strictly greater than`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["BOOLEAN"],
  compute: function(a: number, b: number): boolean {
    return toNumber(a) > toNumber(b);
  }
};

// -----------------------------------------------------------------------------
// GTE
// -----------------------------------------------------------------------------
export const GTE: FunctionDescription = {
  description: `Greater than or equal to`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["BOOLEAN"],
  compute: function(a: number, b: number): boolean {
    return toNumber(a) >= toNumber(b);
  }
};

// -----------------------------------------------------------------------------
// LT
// -----------------------------------------------------------------------------
export const LT: FunctionDescription = {
  description: `Less than`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["BOOLEAN"],
  compute: function(a: number, b: number): boolean {
    return toNumber(a) < toNumber(b);
  }
};

// -----------------------------------------------------------------------------
// LTE
// -----------------------------------------------------------------------------
export const LTE: FunctionDescription = {
  description: `Less than or equal to`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["BOOLEAN"],
  compute: function(a: number, b: number): boolean {
    return toNumber(a) <= toNumber(b);
  }
};

// -----------------------------------------------------------------------------
// MINUS
// -----------------------------------------------------------------------------
export const MINUS: FunctionDescription = {
  description: `Difference of two numbers`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["NUMBER"],
  compute: function(a: number, b: number): number {
    return toNumber(a) - toNumber(b);
  }
};

// -----------------------------------------------------------------------------
// MULTIPLY
// -----------------------------------------------------------------------------
export const MULTIPLY: FunctionDescription = {
  description: `Product of two numbers`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["NUMBER"],
  compute: function(a: number, b: number): number {
    return toNumber(a) * toNumber(b);
  }
};

// -----------------------------------------------------------------------------
// UMINUS
// -----------------------------------------------------------------------------
export const UMINUS: FunctionDescription = {
  description: `A number with the sign reversed`,
  args: args`
      n (number)
    `,
  returns: ["NUMBER"],
  compute: function(n: number): number {
    return -toNumber(n);
  }
};
