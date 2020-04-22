import { evaluateGrid } from "../helpers";

describe("array", () => {
  //----------------------------------------------------------------------------
  // TRANSPOSE
  //----------------------------------------------------------------------------

  test("TRANSPOSE: fonctional tests on range", () => {
    // prettier-ignore
    const grid = {
      A1: "1", B1: "TRUE", 
      A2: "2", B2: "FALSE", 
      A3: "3", B3: '="42"', 
      A4: "4", B4: "test",

      A5: "=TRANSPOSE(A1:B4)"
    }
    const evaluatedGrid = evaluateGrid(grid);

    expect(evaluatedGrid.A5).toBe(1);
    // expect(evaluatedGrid.A6).toBe(true);

    // expect(evaluatedGrid.B5).toBe(2);
    // expect(evaluatedGrid.B6).toBe(false);

    // expect(evaluatedGrid.C5).toBe(3);
    // expect(evaluatedGrid.C6).toBe("42");

    // expect(evaluatedGrid.D5).toBe(4);
    // expect(evaluatedGrid.D6).toBe("test");
  });

  //----------------------------------------------------------------------------
  // TREND
  //----------------------------------------------------------------------------

  test("TREND: fonctional tests on range", () => {
    // prettier-ignore
    const grid = {
      A1: "23", B1: "1", C1: "6",  
      A2: "25", B2: "2", C2: "7", 
      A3: "29", B3: "3", C3: "9", 
      A4: "27", B4: "4", C4: "9",  
      A5: "28", B5: "5", C5: "10", 
      A6: "31", B6: "6", C6: "11",
      A7: "32", B7: "7", C7: "12", 
      A8: "31", B8: "8", C8: "13", 
      A9: "34", B9: "9", C9: "14", 
  
      F1: "=TREND(A1:A9)", 
      G1: "=TREND(A1:A9, B1:B9)",
      H1: "=TREND(A1:A9, C1:C9)", 
      K1: "=TREND(A1:A9, B1:C9)", 
  
      A13: "=TREND(A1:A9, B1:B8)",
  
      F11: "2", G11: "=TREND(A1:A9, B1:B9, F11)", 
      F12: "2", G12: "=TREND(A1:A9, B1:B9, F11, 0)", 
      F13: "2", G13: "=TREND(A1:A9, B1:B9, F11, FALSE)", 
      F14: "2", G14: "=TREND(A1:A9, B1:B9, F11, 1)", 
      F15: "2", G15: "=TREND(A1:A9, B1:B9, F11, 2)", 
      
      // -----------------------------------------------------------------------
  
      A18: "4", B18: "7",    D18: "1", E18: "4",    G18: "1", H18: "4",
      A19: "6", B19: "8",    D19: "2", E19: "5",    G19: "2", H19: "5",
      A20: "5", B20: "9",    D20: "3", E20: "6",    G20: "5", H20: "8",
      
      A22: "=TREND(A18:A20)",
      A26: "=TREND(A18:B20)", 
      D26: "=TREND(A18:B20, D18:E20)",
      G26: "=TREND(A18:B20, G18:H20)",

      J26: "=TREND(A18:B20, D18:D20)",
  
      // -----------------------------------------------------------------------
  
      A33: "1", B33: "4", C33: "7", 
      A34: "2", B34: "5", C34: "8", 
      A35: "5", B35: "8", C35: "11",
      A36: "5", B36: "7", C36: "12",
  
      A38: "=TREND(A33:C36)",
  
      E33: "1",  G33: "=TREND(E33:E44)", I33: "1",  K33: "=TREND(I33:I44)", 
      E34: "2",                          I34: "4",   
      E35: "5",                          I35: "7",   
      E36: "5",                          I36: "2",   
      E37: "4",                          I37: "5",  
      E38: "5",                          I38: "8",   
      E39: "8",                          I39: "5",   
      E40: "7",                          I40: "8",  
      E41: "7",                          I41: "11", 
      E42: "8",                          I42: "5",   
      E43: "11",                         I43: "7",   
      E44: "12",                         I44: "12",  
  
      // -----------------------------------------------------------------------
  
      A50: "1", B50: "4", C50: "7",
      A51: "2", B51: "5", C51: "8",
  
      A53: "=TREND(A50:C51)", 
  
      E50: "1", G50: "=TREND(E50:E55)", I50: "1", K50: "=TREND(I50:I55)", 
      E51: "2",                         I51: "4",  
      E52: "4",                         I52: "7",  
      E53: "5",                         I53: "2",  
      E54: "7",                         I54: "5",  
      E55: "8",                         I55: "8",  
  
      // -----------------------------------------------------------------------
  
      A58: "23", B58: "25", C58: "29", D58: "27", E58: "28", F58: "31", G58: "32", H58: "31", I58: "34",
      A59: "1",  B59: "2",  C59: "3",  D59: "4",  E59: "5",  F59: "6",  G59: "7",  H59: "8",  I59: "9",  
      A60: "6",  B60: "7",  C60: "9",  D60: "9",  E60: "10", F60: "11", G60: "12", H60: "13", I60: "14",
      
      K61: "=TREND(A58:I58, A59:H59)", 
  
      A63: "=TREND(A58:I58)",
      A64: "=TREND(A58:I58, A59:I59)", 
      A65: "=TREND(A58:I58, A60:I60)", 

      A68: "=TREND(A58:I58, A59:I60)", 
  
      // -------------------------------------------------------------------------
  
      B71: "6",  C71: "45",  D71: "3100", E71: "=TREND(D71:D82, B71:C82)",
      B72: "7",  C72: "55",  D72: "3700", 
      B73: "7",  C73: "47",  D73: "3500", 
      B74: "8",  C74: "60",  D74: "3400", 
      B75: "8",  C75: "90",  D75: "3350", 
      B76: "9",  C76: "100", D76: "4400", 
      B77: "10", C77: "100", D77: "4500", 
      B78: "9",  C78: "95",  D78: "4000", 
      B79: "9",  C79: "88",  D79: "4200", 
      B80: "8",  C80: "50",  D80: "3800", 
      B81: "8",  C81: "45",  D81: "3500", 
      B82: "7",  C82: "58",  D82: "3400", 
      B83: "7",  C83: "47",               E83: "=TREND(D71:D82, B71:C82, B83:C86)",
      B84: "8",  C84: "58",               
      B85: "8",  C85: "59",               
      B86: "9",  C86: "62",               
    };

    const evaluatedGrid = evaluateGrid(grid);

    expect(evaluatedGrid.F1).toBeCloseTo(24.08, 1);
    expect(evaluatedGrid.G1).toBeCloseTo(24.08, 1);
    expect(evaluatedGrid.H1).toBeCloseTo(23.67, 1);
    expect(evaluatedGrid.K1).toBeCloseTo(23.34, 1);

    expect(evaluatedGrid.A13).toBe("#ERROR");

    expect(evaluatedGrid.G11).toBeCloseTo(25.28, 1);
    expect(evaluatedGrid.G12).toBeCloseTo(9.62, 1);
    expect(evaluatedGrid.G13).toBeCloseTo(9.62, 1);
    expect(evaluatedGrid.G14).toBeCloseTo(25.28, 1);
    expect(evaluatedGrid.G15).toBeCloseTo(25.28, 1);

    expect(evaluatedGrid.A22).toBeCloseTo(4.5, 1);
    expect(evaluatedGrid.A26).toBeCloseTo(4.14, 1);
    expect(evaluatedGrid.D26).toBeCloseTo(4.14, 1);
    expect(evaluatedGrid.G26).toBeCloseTo(4.6, 1);

    expect(evaluatedGrid.J26).toBe("#ERROR");

    expect(evaluatedGrid.A38).toBeCloseTo(1.53, 1);
    expect(evaluatedGrid.G33).toBeCloseTo(1.53, 1);
    expect(evaluatedGrid.K33).toBeCloseTo(2.69, 1);

    expect(evaluatedGrid.A53).toBeCloseTo(0.85, 1);
    expect(evaluatedGrid.G50).toBeCloseTo(0.85, 1);
    expect(evaluatedGrid.K50).toBeCloseTo(2.14, 1);

    expect(evaluatedGrid.K61).toBe("#ERROR");

    expect(evaluatedGrid.A63).toBeCloseTo(24.08, 1);
    expect(evaluatedGrid.A64).toBeCloseTo(24.08, 1);
    expect(evaluatedGrid.A65).toBeCloseTo(23.67, 1);
    expect(evaluatedGrid.A68).toBeCloseTo(23.34, 1);

    expect(evaluatedGrid.E71).toBeCloseTo(3070.66, 1);
    expect(evaluatedGrid.E83).toBeCloseTo(3382.35, 1);
  });
});
