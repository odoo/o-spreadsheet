import { args } from "./arguments";
import { FunctionMap } from "./index";

export const functions: FunctionMap = {
  ADD: {
    description: `Sum of two numbers`,
    args: args`
      a (number)
      b (number)
    `,
    returns: ["NUMBER"],
    compute: function(a: number, b: number): number {
      return a + b;
    }
  },
  DIVIDE: {
    description: `One number divided by another`,
    args: args`
      a (number)
      b (number)
    `,
    returns: ["NUMBER"],
    compute: function(a: number, b: number): number {
      return a / b;
    }
  },
  EQ: {
    description: `Equality of two numbers`,
    args: args`
      a (number)
      b (number)
    `,
    returns: ["BOOLEAN"],
    compute: function(a: number, b: number): boolean {
      return a === b;
    }
  },
  GT: {
    description: `Strictly greater than`,
    args: args`
      a (number)
      b (number)
    `,
    returns: ["BOOLEAN"],
    compute: function(a: number, b: number): boolean {
      return a > b;
    }
  },
  GTE: {
    description: `Greater than or equal to`,
    args: args`
      a (number)
      b (number)
    `,
    returns: ["BOOLEAN"],
    compute: function(a: number, b: number): boolean {
      return a >= b;
    }
  },
  LT: {
    description: `Less than`,
    args: args`
      a (number)
      b (number)
    `,
    returns: ["BOOLEAN"],
    compute: function(a: number, b: number): boolean {
      return a < b;
    }
  },
  LTE: {
    description: `Less than or equal to`,
    args: args`
      a (number)
      b (number)
    `,
    returns: ["BOOLEAN"],
    compute: function(a: number, b: number): boolean {
      return a <= b;
    }
  },
  MINUS: {
    description: `Difference of two numbers`,
    args: args`
      a (number)
      b (number)
    `,
    returns: ["NUMBER"],
    compute: function(a: number, b: number): number {
      return a - b;
    }
  },
  MULTIPLY: {
    description: `Product of two numbers`,
    args: args`
      a (number)
      b (number)
    `,
    returns: ["NUMBER"],
    compute: function(a: number, b: number): number {
      return a * b;
    }
  },
  UMINUS: {
    description: `A number with the sign reversed`,
    args: args`
      n (number)
    `,
    returns: ["NUMBER"],
    compute: function(n: number): number {
      return -n;
    }
  }
};
