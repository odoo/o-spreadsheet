import { args, toNumber } from "./arguments";
import { FunctionDescription } from "./index";

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

export const DIVIDE: FunctionDescription = {
  description: `One number divided by another`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["NUMBER"],
  compute: function(a: number, b: number): number {
    return toNumber(a) / toNumber(b);
  }
};

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

export const MINUS: FunctionDescription = {
  description: `Difference of two numbers`,
  args: args`
      a (number)
      b (number)
    `,
  returns: ["NUMBER"],
  compute: function(a: number, b: number): number {
    return  toNumber(a) - toNumber(b);
  }
};

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
