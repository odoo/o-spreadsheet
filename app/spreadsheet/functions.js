export const functions = {
  SUM: {
    description: "Returns the sum of all values in a range",
    compute: function(...args) {
      return args.flat().reduce((a, b) => a + b, 0);
    }
  }
};
