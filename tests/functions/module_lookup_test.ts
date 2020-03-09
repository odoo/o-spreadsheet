import { evaluateGrid } from "../helpers";

describe("lookup", () => {
  //----------------------------------------------------------------------------
  // VLOOKUP
  //----------------------------------------------------------------------------

  // prettier-ignore
  const gridSorted = {
    A1: "1", B1: "res 1",
    A2: "2", B2: "res 2.1",
    A3: "2", B3: "res 2.2",
    A4: "3", B4: "res 3",
    A5: "5", B5: "res 5",
    A6: "6", B6: "res 6",
  };

  // prettier-ignore
  const gridNotSorted = {
    A1: "1", B1: "res 1",
    A2: "2", B2: "res 2.1",
    A3: "3", B3: "res 3",
    A4: "2", B4: "res 2.2",
    A5: "5", B5: "res 5",
    A6: "6", B6: "res 6",
  };

  // prettier-ignore
  const evAsSorted = {
   C1: "=VLOOKUP( 0, A1:B6, 1, TRUE )",   D1: "=VLOOKUP( 0, A1:B6, 2, TRUE )",
   C2: "=VLOOKUP( 1, A1:B6, 1, TRUE )",   D2: "=VLOOKUP( 1, A1:B6, 2, TRUE )",
   C3: "=VLOOKUP( 2, A1:B6, 1, TRUE )",   D3: "=VLOOKUP( 2, A1:B6, 2, TRUE )",
   C4: "=VLOOKUP( 3, A1:B6, 1, TRUE )",   D4: "=VLOOKUP( 3, A1:B6, 2, TRUE )",
   C5: "=VLOOKUP( 4, A1:B6, 1, TRUE )",   D5: "=VLOOKUP( 4, A1:B6, 2, TRUE )",
   C6: "=VLOOKUP( 5, A1:B6, 1, TRUE )",   D6: "=VLOOKUP( 5, A1:B6, 2, TRUE )",
   C7: "=VLOOKUP( 6, A1:B6, 1, TRUE )",   D7: "=VLOOKUP( 6, A1:B6, 2, TRUE )",
   C8: "=VLOOKUP( 7, A1:B6, 1, TRUE )",   D8: "=VLOOKUP( 7, A1:B6, 2, TRUE )",

   E1: "=VLOOKUP( 0, A1:B6, 0, TRUE )",   F1: "=VLOOKUP( 0, A1:B6, 3, TRUE )",
   E2: "=VLOOKUP( 1, A1:B6, 0, TRUE )",   F2: "=VLOOKUP( 1, A1:B6, 3, TRUE )",

   G1: "=VLOOKUP( 1, A1:B6, 2.8, TRUE )",
  };

  // prettier-ignore
  const evAsNotSorted = {
    C1: "=VLOOKUP( 0, A1:B6, 1, FALSE )",   D1: "=VLOOKUP( 0, A1:B6, 2, FALSE )",
    C2: "=VLOOKUP( 1, A1:B6, 1, FALSE )",   D2: "=VLOOKUP( 1, A1:B6, 2, FALSE )",
    C3: "=VLOOKUP( 2, A1:B6, 1, FALSE )",   D3: "=VLOOKUP( 2, A1:B6, 2, FALSE )",
    C4: "=VLOOKUP( 3, A1:B6, 1, FALSE )",   D4: "=VLOOKUP( 3, A1:B6, 2, FALSE )",
    C5: "=VLOOKUP( 4, A1:B6, 1, FALSE )",   D5: "=VLOOKUP( 4, A1:B6, 2, FALSE )",
    C6: "=VLOOKUP( 5, A1:B6, 1, FALSE )",   D6: "=VLOOKUP( 5, A1:B6, 2, FALSE )",
    C7: "=VLOOKUP( 6, A1:B6, 1, FALSE )",   D7: "=VLOOKUP( 6, A1:B6, 2, FALSE )",
    C8: "=VLOOKUP( 7, A1:B6, 1, FALSE )",   D8: "=VLOOKUP( 7, A1:B6, 2, FALSE )",

    E1: "=VLOOKUP( 0, A1:B6, 0, FALSE )",   F1: "=VLOOKUP( 0, A1:B6, 3, FALSE )",
    E2: "=VLOOKUP( 1, A1:B6, 0, FALSE )",   F2: "=VLOOKUP( 1, A1:B6, 3, FALSE )",
 
    G1: "=VLOOKUP( 1, A1:B6, 2.8, FALSE )",    
  };

  // prettier-ignore
  test("VLOOKUP: grid (sorted) evaluate as sorted" , () => {

    const gridSortedEvAsSorted = {...gridSorted, ...evAsSorted};
    const sAsS = evaluateGrid(gridSortedEvAsSorted);

    // case is_sorted is true: If all values in the search column are greater 
    // than the search key, #ERROR is returned.
    // @compatibility: on google sheets return #N/A
    expect(sAsS.C1).toEqual("#ERROR");  expect(sAsS.D1).toEqual("#ERROR");

    // normal behavior: 
    expect(sAsS.C2).toEqual(1);  expect(sAsS.D2).toEqual("res 1");
    expect(sAsS.C4).toEqual(3);  expect(sAsS.D4).toEqual("res 3");
    expect(sAsS.C6).toEqual(5);  expect(sAsS.D6).toEqual("res 5");
    expect(sAsS.C7).toEqual(6);  expect(sAsS.D7).toEqual("res 6");
    
    // multiple matching values: contrary to 'is_sorted = FALSE' 
    // return the last founded value and no the first
    expect(sAsS.C3).toEqual(2);  expect(sAsS.D3).toEqual("res 2.2");

    // no present value: return the nearest match 
    // (less than or equal to the search key)
    expect(sAsS.C5).toEqual(3);  expect(sAsS.D5).toEqual("res 3");
    expect(sAsS.C8).toEqual(6);  expect(sAsS.D8).toEqual("res 6");

    // error on index: if index is not between 1 and the number of columns in 
    // range, #ERROR is returned"
    // @compatibility: on googlesheets, return #VALUE!
    expect(sAsS.E1).toEqual("#ERROR"); expect(sAsS.F1).toEqual("#ERROR");
    expect(sAsS.E2).toEqual("#ERROR"); expect(sAsS.F2).toEqual("#ERROR");
    
    // float index 
    expect(sAsS.G1).toEqual("res 1");
  });

  // prettier-ignore
  test("VLOOKUP: grid (not sorted) evaluate as sorted" , () => {

    const gridNotSortedEvAsSorted = {...gridNotSorted, ...evAsSorted};
    const nsAsS = evaluateGrid(gridNotSortedEvAsSorted);

    // case is_sorted is true: If all values in the search column are greater 
    // than the search key, #ERROR is returned.
    // @compatibility: on google sheets return #N/A
    expect(nsAsS.C1).toEqual("#ERROR");  expect(nsAsS.D1).toEqual("#ERROR");

    // normal behavior: 
    expect(nsAsS.C2).toEqual(1);  expect(nsAsS.D2).toEqual("res 1");
    expect(nsAsS.C6).toEqual(5);  expect(nsAsS.D6).toEqual("res 5");
    expect(nsAsS.C7).toEqual(6);  expect(nsAsS.D7).toEqual("res 6");
    
    // multiple matching values: contrary to 'is_sorted = FALSE' 
    // return the last founded value and no the first
    expect(nsAsS.C3).toEqual(2);  expect(nsAsS.D3).toEqual("res 2.2");

    // if is_sorted is set to TRUE or omitted, and the first column of the range 
    // is not in sorted order, an incorrect value might be returned.
    expect(nsAsS.C4).toEqual(2);  expect(nsAsS.D4).toEqual("res 2.2");
    expect(nsAsS.C5).toEqual(2);  expect(nsAsS.D5).toEqual("res 2.2");

    // no present value: return the nearest match 
    // (less than or equal to the search key)
    expect(nsAsS.C8).toEqual(6);  expect(nsAsS.D8).toEqual("res 6");

    // error on index: if index is not between 1 and the number of columns in 
    // range, #ERROR is returned
    // @compatibility: on googlesheets, return #VALUE!
    expect(nsAsS.E1).toEqual("#ERROR"); expect(nsAsS.F1).toEqual("#ERROR");
    expect(nsAsS.E2).toEqual("#ERROR"); expect(nsAsS.F2).toEqual("#ERROR");
    
    // float index 
    expect(nsAsS.G1).toEqual("res 1");
  });

  // prettier-ignore
  test("VLOOKUP: grid (sorted and not sorted) evaluate as not sorted" , () => {

    const gridSortedEvAsNotSorted = {...gridSorted, ...evAsNotSorted};
    const sAsNs = evaluateGrid(gridSortedEvAsNotSorted);
  
    const gridNotSortedEvAsNotSorted = {...gridNotSorted, ...evAsNotSorted};
    const nsAsNs = evaluateGrid(gridNotSortedEvAsNotSorted);

    // case is_sorted is false: #ERROR is returned if no such value is found.
    // @compatibility: on google sheets return #N/A
    expect(sAsNs.C1).toEqual("#ERROR");  expect(sAsNs.D1).toEqual("#ERROR");
    expect(sAsNs.C5).toEqual("#ERROR");  expect(sAsNs.D5).toEqual("#ERROR");
    expect(sAsNs.C8).toEqual("#ERROR");  expect(sAsNs.D8).toEqual("#ERROR");
    expect(nsAsNs.C1).toEqual("#ERROR");  expect(nsAsNs.D1).toEqual("#ERROR");
    expect(nsAsNs.C5).toEqual("#ERROR");  expect(nsAsNs.D5).toEqual("#ERROR");
    expect(nsAsNs.C8).toEqual("#ERROR");  expect(nsAsNs.D8).toEqual("#ERROR");

    // normal behavior: 
    expect(sAsNs.C2).toEqual(1);  expect(sAsNs.D2).toEqual("res 1");
    expect(sAsNs.C4).toEqual(3);  expect(sAsNs.D4).toEqual("res 3");
    expect(sAsNs.C6).toEqual(5);  expect(sAsNs.D6).toEqual("res 5");
    expect(sAsNs.C7).toEqual(6);  expect(sAsNs.D7).toEqual("res 6");
    expect(nsAsNs.C2).toEqual(1);  expect(nsAsNs.D2).toEqual("res 1");
    expect(nsAsNs.C4).toEqual(3);  expect(nsAsNs.D4).toEqual("res 3");
    expect(nsAsNs.C6).toEqual(5);  expect(nsAsNs.D6).toEqual("res 5");
    expect(nsAsNs.C7).toEqual(6);  expect(nsAsNs.D7).toEqual("res 6");
    
    // multiple matching values: contrary to 'is_sorted = TRUE' 
    // return the first founded value and no the last
    expect(sAsNs.C3).toEqual(2);  expect(sAsNs.D3).toEqual("res 2.1");
    expect(nsAsNs.C3).toEqual(2);  expect(nsAsNs.D3).toEqual("res 2.1");

    // error on index: if index is not between 1 and the number of columns in 
    // range, #ERROR is returned
    // @compatibility: on googlesheets, return #VALUE!
    expect(sAsNs.E1).toEqual("#ERROR"); expect(sAsNs.F1).toEqual("#ERROR");
    expect(sAsNs.E2).toEqual("#ERROR"); expect(sAsNs.F2).toEqual("#ERROR");
    expect(nsAsNs.E1).toEqual("#ERROR"); expect(nsAsNs.F1).toEqual("#ERROR");
    expect(nsAsNs.E2).toEqual("#ERROR"); expect(nsAsNs.F2).toEqual("#ERROR");

    // float index 
    expect(sAsNs.G1).toEqual("res 1");
    expect(nsAsNs.G1).toEqual("res 1");
  });

  // prettier-ignore
  const gridOfStringSorted = {
    A1: '="1"',   B1: "res 1",
    A2: '="10"',  B2: "res 10",
    A3: '="100"', B3: "res 100",
    A4: '="2"',   B4: "res 2.1",
    A5: '="2"',   B5: "res 2.2",
  };

  // prettier-ignore
  const gridOfStringNotSorted = {
    A1: '="1"',   B1: "res 1",
    A2: '="2"',   B2: "res 2.1",
    A3: '="2"',   B3: "res 2.2",
    A4: '="10"',  B4: "res 10",
    A5: '="100"', B5: "res 100",
  };

  // prettier-ignore
  const evAsSortedString = {
    C1: '=VLOOKUP( "1",   A1:B5, 1, TRUE )',   D1: '=VLOOKUP( "1",   A1:B5, 2, TRUE )',
    C2: '=VLOOKUP( "2",   A1:B5, 1, TRUE )',   D2: '=VLOOKUP( "2",   A1:B5, 2, TRUE )',
    C3: '=VLOOKUP( "5",   A1:B5, 1, TRUE )',   D3: '=VLOOKUP( "5",   A1:B5, 2, TRUE )',
    C4: '=VLOOKUP( "10",  A1:B5, 1, TRUE )',   D4: '=VLOOKUP( "10",  A1:B5, 2, TRUE )',
    C5: '=VLOOKUP( "100", A1:B5, 1, TRUE )',   D5: '=VLOOKUP( "100", A1:B5, 2, TRUE )',
   };

  // prettier-ignore
  const evAsNotSortedString = {
    C1: '=VLOOKUP( "1",   A1:B5, 1, FALSE )',   D1: '=VLOOKUP( "1",   A1:B5, 2, FALSE )',
    C2: '=VLOOKUP( "2",   A1:B5, 1, FALSE )',   D2: '=VLOOKUP( "2",   A1:B5, 2, FALSE )',
    C3: '=VLOOKUP( "5",   A1:B5, 1, FALSE )',   D3: '=VLOOKUP( "5",   A1:B5, 2, FALSE )',
    C4: '=VLOOKUP( "10",  A1:B5, 1, FALSE )',   D4: '=VLOOKUP( "10",  A1:B5, 2, FALSE )',
    C5: '=VLOOKUP( "100", A1:B5, 1, FALSE )',   D5: '=VLOOKUP( "100", A1:B5, 2, FALSE )',
   };

  // prettier-ignore
  test("VLOOKUP: grid of STRING (sorted) evaluate as sorted" , () => {

    const gridOfStringSortedEvAsSortedString = {...gridOfStringSorted, ...evAsSortedString};
    const ssAsSs = evaluateGrid(gridOfStringSortedEvAsSortedString);

    expect(ssAsSs.C1).toEqual("1");    expect(ssAsSs.D1).toEqual("res 1");
    expect(ssAsSs.C2).toEqual("2");    expect(ssAsSs.D2).toEqual("res 2.2");
    expect(ssAsSs.C3).toEqual("2");    expect(ssAsSs.D3).toEqual("res 2.2");
    expect(ssAsSs.C4).toEqual("10");   expect(ssAsSs.D4).toEqual("res 10");
    expect(ssAsSs.C5).toEqual("100");  expect(ssAsSs.D5).toEqual("res 100");
  });

  // prettier-ignore
  test("VLOOKUP: grid of STRING (not sorted) evaluate as sorted" , () => {

    const gridOfStringNotSortedEvAsSortedString = {...gridOfStringNotSorted, ...evAsSortedString};
    const nssAsSs = evaluateGrid(gridOfStringNotSortedEvAsSortedString);

    expect(nssAsSs.C1).toEqual("1");   expect(nssAsSs.D1).toEqual("res 1");
    expect(nssAsSs.C2).toEqual("100"); expect(nssAsSs.D2).toEqual("res 100");
    expect(nssAsSs.C3).toEqual("100"); expect(nssAsSs.D3).toEqual("res 100");
    expect(nssAsSs.C4).toEqual("1");   expect(nssAsSs.D4).toEqual("res 1");
    expect(nssAsSs.C5).toEqual("1");   expect(nssAsSs.D5).toEqual("res 1");
  });

  // prettier-ignore
  test("VLOOKUP: grid of STRING (sorted and not sorted) evaluate as not sorted" , () => {

    const gridOfStringSortedEvAsNotSortedString = {...gridOfStringSorted, ...evAsNotSortedString};
    const ssAsNss = evaluateGrid(gridOfStringSortedEvAsNotSortedString);

    const gridOfStringNotSortedEvAsNotSortedString = {...gridOfStringNotSorted, ...evAsNotSortedString};
    const nssAsNss = evaluateGrid(gridOfStringNotSortedEvAsNotSortedString);

    expect(ssAsNss.C1).toEqual("1");   expect(ssAsNss.D1).toEqual("res 1");
    expect(nssAsNss.C1).toEqual("1");   expect(nssAsNss.D1).toEqual("res 1");

    expect(ssAsNss.C2).toEqual("2"); expect(ssAsNss.D2).toEqual("res 2.1");
    expect(nssAsNss.C2).toEqual("2"); expect(nssAsNss.D2).toEqual("res 2.1");

    expect(ssAsNss.C3).toEqual("#ERROR"); expect(ssAsNss.D3).toEqual("#ERROR");
    expect(nssAsNss.C3).toEqual("#ERROR"); expect(nssAsNss.D3).toEqual("#ERROR");

    expect(ssAsNss.C4).toEqual("10");   expect(ssAsNss.D4).toEqual("res 10");
    expect(nssAsNss.C4).toEqual("10");   expect(nssAsNss.D4).toEqual("res 10");

    expect(ssAsNss.C5).toEqual("100");   expect(ssAsNss.D5).toEqual("res 100");
    expect(nssAsNss.C5).toEqual("100");   expect(nssAsNss.D5).toEqual("res 100");
  });
});
