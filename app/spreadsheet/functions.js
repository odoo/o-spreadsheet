export const functions = {
  SUM: {
    description: "Returns the sum of all values in a range",
    compute: function(range) {
      return range.reduce((a, b) => a + b, 0);
    }
  }
};
