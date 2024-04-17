import { toUnboundedZone, zoneToXc } from "../../src/helpers";
import { futureRecomputeZones, modifyProfiles } from "../../src/helpers/recompute_zones";

const recomputeZonesFromXC = function (xcs: string[], xcsToRemove: string[]): string[] {
  return futureRecomputeZones(xcs.map(toUnboundedZone), xcsToRemove.map(toUnboundedZone)).map(
    zoneToXc
  );
};

// Only to test result after modifyProfiles
function computeProfiles(xcs: string[], xcsToRemove: string[]): Map<number, number[]> {
  const zones = xcs.map(toUnboundedZone);
  const zonesToRemove = xcsToRemove.map(toUnboundedZone);

  const profilesStartingPosition: number[] = [0];
  const profiles = new Map<number, number[]>([[0, []]]);

  modifyProfiles(profilesStartingPosition, profiles, zones, false);
  modifyProfiles(profilesStartingPosition, profiles, zonesToRemove, true);
  return profiles;
}

// This 'describe' is here to test the modifyProfile function that is an intermediate step in the recomputeZones process.
// We test the intermediate step and not the final result because this step is both complex and fundamental in the recompute.
// You can find more information in the "recompute_zone" file.
describe("modifyProfiles", () => {
  test("modifProfiles with one range", () => {
    const conf1 = ["C3:E5"];
    const result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
  });

  test("modifyProfiles with unbounded range", () => {
    const conf1 = ["C3:E5", "C4:E"];
    const result = new Map<number, number[]>([
      [0, []],
      [2, [2]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
  });

  describe("translation of 2x1 on row 0 with C3:E5", () => {
    test("A1:B1", () => {
      const conf1 = ["A1:B1", "C3:E5"];
      const conf2 = ["C3:E5", "A1:B1"];
      const result = new Map<number, number[]>([
        [0, [0, 1]],
        [2, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("B1:C1", () => {
      const conf1 = ["B1:C1", "C3:E5"];
      const conf2 = ["C3:E5", "B1:C1"];
      const result = new Map<number, number[]>([
        [0, []],
        [1, [0, 1]],
        [2, [0, 1, 2, 5]],
        [3, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("C1:D1", () => {
      const conf1 = ["C1:D1", "C3:E5"];
      const conf2 = ["C3:E5", "C1:D1"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [0, 1, 2, 5]],
        [4, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("D1:E1", () => {
      const conf1 = ["D1:E1", "C3:E5"];
      const conf2 = ["C3:E5", "D1:E1"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [3, [0, 1, 2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("E1:F1", () => {
      const conf1 = ["E1:F1", "C3:E5"];
      const conf2 = ["C3:E5", "E1:F1"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [4, [0, 1, 2, 5]],
        [5, [0, 1]],
        [6, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("F1:G1", () => {
      const conf1 = ["F1:G1", "C3:E5"];
      const conf2 = ["C3:E5", "F1:G1"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, [0, 1]],
        [7, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("G1:H1", () => {
      const conf1 = ["G1:H1", "C3:E5"];
      const conf2 = ["C3:E5", "G1:H1"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, []],
        [6, [0, 1]],
        [8, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });
  });

  describe("translation of 2x2 on row 0 with C3:E5", () => {
    test("A1:B2", () => {
      const conf1 = ["A1:B2", "C3:E5"];
      const conf2 = ["C3:E5", "A1:B2"];
      const result = new Map<number, number[]>([
        [0, [0, 2]],
        [2, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("B1:C2", () => {
      const conf1 = ["B1:C2", "C3:E5"];
      const conf2 = ["C3:E5", "B1:C2"];
      const result = new Map<number, number[]>([
        [0, []],
        [1, [0, 2]],
        [2, [0, 5]],
        [3, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("C1:D2", () => {
      const conf1 = ["C1:D2", "C3:E5"];
      const conf2 = ["C3:E5", "C1:D2"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [0, 5]],
        [4, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("D1:E2", () => {
      const conf1 = ["D1:E2", "C3:E5"];
      const conf2 = ["C3:E5", "D1:E2"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [3, [0, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("E1:F2", () => {
      const conf1 = ["E1:F2", "C3:E5"];
      const conf2 = ["C3:E5", "E1:F2"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [4, [0, 5]],
        [5, [0, 2]],
        [6, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("F1:G2", () => {
      const conf1 = ["F1:G2", "C3:E5"];
      const conf2 = ["C3:E5", "F1:G2"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, [0, 2]],
        [7, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("G1:H2", () => {
      const conf1 = ["G1:H2", "C3:E5"];
      const conf2 = ["C3:E5", "G1:H2"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, []],
        [6, [0, 2]],
        [8, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });
  });

  describe("translation of 2x2 on row 1 with C3:E5", () => {
    test("A2:B3", () => {
      const conf1 = ["A2:B3", "C3:E5"];
      const conf2 = ["C3:E5", "A2:B3"];
      const result = new Map<number, number[]>([
        [0, [1, 3]],
        [2, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("B2:C3", () => {
      const conf1 = ["B2:C3", "C3:E5"];
      const conf2 = ["C3:E5", "B2:C3"];
      const result = new Map<number, number[]>([
        [0, []],
        [1, [1, 3]],
        [2, [1, 5]],
        [3, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("C2:D3", () => {
      const conf1 = ["C2:D3", "C3:E5"];
      const conf2 = ["C3:E5", "C2:D3"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [1, 5]],
        [4, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("D2:E3", () => {
      const conf1 = ["D2:E3", "C3:E5"];
      const conf2 = ["C3:E5", "D2:E3"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [3, [1, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("E2:F3", () => {
      const conf1 = ["E2:F3", "C3:E5"];
      const conf2 = ["C3:E5", "E2:F3"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [4, [1, 5]],
        [5, [1, 3]],
        [6, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("F2:G3", () => {
      const conf1 = ["F2:G3", "C3:E5"];
      const conf2 = ["C3:E5", "F2:G3"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, [1, 3]],
        [7, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("G2:H3", () => {
      const conf1 = ["G2:H3", "C3:E5"];
      const conf2 = ["C3:E5", "G2:H3"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, []],
        [6, [1, 3]],
        [8, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });
  });

  describe("translation of 2x2 on row 2 with C3:E5", () => {
    test("A3:B4", () => {
      const conf1 = ["A3:B4", "C3:E5"];
      const conf2 = ["C3:E5", "A3:B4"];
      const result = new Map<number, number[]>([
        [0, [2, 4]],
        [2, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("B3:C4", () => {
      const conf1 = ["B3:C4", "C3:E5"];
      const conf2 = ["C3:E5", "B3:C4"];
      const result = new Map<number, number[]>([
        [0, []],
        [1, [2, 4]],
        [2, [2, 5]],
        // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [3, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("C3:D4", () => {
      const conf1 = ["C3:D4", "C3:E5"];
      const conf2 = ["C3:E5", "C3:D4"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [4, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("D3:E4", () => {
      const conf1 = ["D3:E4", "C3:E5"];
      const conf2 = ["C3:E5", "D3:E4"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [3, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("E3:F4", () => {
      const conf1 = ["E3:F4", "C3:E5"];
      const conf2 = ["C3:E5", "E3:F4"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [4, [2, 5]],
        [5, [2, 4]],
        [6, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("F3:G4", () => {
      const conf1 = ["F3:G4", "C3:E5"];
      const conf2 = ["C3:E5", "F3:G4"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, [2, 4]],
        [7, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("G3:H4", () => {
      const conf1 = ["G3:H4", "C3:E5"];
      const conf2 = ["C3:E5", "G3:H4"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, []],
        [6, [2, 4]],
        [8, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });
  });

  describe("translation of 2x2 on row 3 with C3:E5", () => {
    test("A4:B5", () => {
      const conf1 = ["A4:B5", "C3:E5"];
      const conf2 = ["C3:E5", "A4:B5"];
      const result = new Map<number, number[]>([
        [0, [3, 5]],
        [2, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("B4:C5", () => {
      const conf1 = ["B4:C5", "C3:E5"];
      const conf2 = ["C3:E5", "B4:C5"];
      const result = new Map<number, number[]>([
        [0, []],
        [1, [3, 5]],
        [2, [2, 5]],
        // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [3, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("C4:D5", () => {
      const conf1 = ["C4:D5", "C3:E5"];
      const conf2 = ["C3:E5", "C4:D5"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [4, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("D4:E5", () => {
      const conf1 = ["D4:E5", "C3:E5"];
      const conf2 = ["C3:E5", "D4:E5"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [3, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("E4:F5", () => {
      const conf1 = ["E4:F5", "C3:E5"];
      const conf2 = ["C3:E5", "E4:F5"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [4, [2, 5]],
        [5, [3, 5]],
        [6, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("F4:G5", () => {
      const conf1 = ["F4:G5", "C3:E5"];
      const conf2 = ["C3:E5", "F4:G5"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, [3, 5]],
        [7, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("G4:H5", () => {
      const conf1 = ["G4:H5", "C3:E5"];
      const conf2 = ["C3:E5", "G4:H5"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, []],
        [6, [3, 5]],
        [8, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });
  });

  describe("translation of 2x2 on row 4 with C3:E5", () => {
    test("A5:B6", () => {
      const conf1 = ["A5:B6", "C3:E5"];
      const conf2 = ["C3:E5", "A5:B6"];
      const result = new Map<number, number[]>([
        [0, [4, 6]],
        [2, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("B5:C6", () => {
      const conf1 = ["B5:C6", "C3:E5"];
      const conf2 = ["C3:E5", "B5:C6"];
      const result = new Map<number, number[]>([
        [0, []],
        [1, [4, 6]],
        [2, [2, 6]],
        [3, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("C5:D6", () => {
      const conf1 = ["C5:D6", "C3:E5"];
      const conf2 = ["C3:E5", "C5:D6"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 6]],
        [4, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("D5:E6", () => {
      const conf1 = ["D5:E6", "C3:E5"];
      const conf2 = ["C3:E5", "D5:E6"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [3, [2, 6]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("E5:F6", () => {
      const conf1 = ["E5:F6", "C3:E5"];
      const conf2 = ["C3:E5", "E5:F6"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [4, [2, 6]],
        [5, [4, 6]],
        [6, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("F5:G6", () => {
      const conf1 = ["F5:G6", "C3:E5"];
      const conf2 = ["C3:E5", "F5:G6"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, [4, 6]],
        [7, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("G5:H6", () => {
      const conf1 = ["G5:H6", "C3:E5"];
      const conf2 = ["C3:E5", "G5:H6"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, []],
        [6, [4, 6]],
        [8, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });
  });

  describe("translation of 2x2 on row 5 with C3:E5", () => {
    test("A6:B7", () => {
      const conf1 = ["A6:B7", "C3:E5"];
      const conf2 = ["C3:E5", "A6:B7"];
      const result = new Map<number, number[]>([
        [0, [5, 7]],
        [2, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("B6:C7", () => {
      const conf1 = ["B6:C7", "C3:E5"];
      const conf2 = ["C3:E5", "B6:C7"];
      const result = new Map<number, number[]>([
        [0, []],
        [1, [5, 7]],
        [2, [2, 7]],
        [3, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("C6:D7", () => {
      const conf1 = ["C6:D7", "C3:E5"];
      const conf2 = ["C3:E5", "C6:D7"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 7]],
        [4, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("D6:E7", () => {
      const conf1 = ["D6:E7", "C3:E5"];
      const conf2 = ["C3:E5", "D6:E7"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [3, [2, 7]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("E6:F7", () => {
      const conf1 = ["E6:F7", "C3:E5"];
      const conf2 = ["C3:E5", "E6:F7"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [4, [2, 7]],
        [5, [5, 7]],
        [6, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("F6:G7", () => {
      const conf1 = ["F6:G7", "C3:E5"];
      const conf2 = ["C3:E5", "F6:G7"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, [5, 7]],
        [7, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("G6:H7", () => {
      const conf1 = ["G6:H7", "C3:E5"];
      const conf2 = ["C3:E5", "G6:H7"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, []],
        [6, [5, 7]],
        [8, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });
  });

  describe("translation of 2x2 on row 6 with C3:E5", () => {
    test("A7:B8", () => {
      const conf1 = ["A7:B8", "C3:E5"];
      const conf2 = ["C3:E5", "A7:B8"];
      const result = new Map<number, number[]>([
        [0, [6, 8]],
        [2, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("B7:C8", () => {
      const conf1 = ["B7:C8", "C3:E5"];
      const conf2 = ["C3:E5", "B7:C8"];
      const result = new Map<number, number[]>([
        [0, []],
        [1, [6, 8]],
        [2, [2, 5, 6, 8]],
        [3, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("C7:D8", () => {
      const conf1 = ["C7:D8", "C3:E5"];
      const conf2 = ["C3:E5", "C7:D8"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5, 6, 8]],
        [4, [2, 5]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("D7:E8", () => {
      const conf1 = ["D7:E8", "C3:E5"];
      const conf2 = ["C3:E5", "D7:E8"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [3, [2, 5, 6, 8]],
        [5, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("E7:F8", () => {
      const conf1 = ["E7:F8", "C3:E5"];
      const conf2 = ["C3:E5", "E7:F8"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [4, [2, 5, 6, 8]],
        [5, [6, 8]],
        [6, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("F7:G8", () => {
      const conf1 = ["F7:G8", "C3:E5"];
      const conf2 = ["C3:E5", "F7:G8"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, [6, 8]],
        [7, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });

    test("G7:H8", () => {
      const conf1 = ["G7:H8", "C3:E5"];
      const conf2 = ["C3:E5", "G7:H8"];
      const result = new Map<number, number[]>([
        [0, []],
        [2, [2, 5]],
        [5, []],
        [6, [6, 8]],
        [8, []],
      ]);
      expect(computeProfiles(conf1, [])).toEqual(result);
      expect(computeProfiles(conf2, [])).toEqual(result);
    });
  });
});

describe("recomputeZones", () => {
  test("on a simple zone", () => {
    const conf1 = ["A1:B1"];
    expect(recomputeZonesFromXC(conf1, [])).toEqual(conf1);
  });

  test.each([
    ["A1:B1", ["A1:B1", "C3:E5"]],
    ["B1:C1", ["B1:C1", "C3:E5"]],
    ["C1:D1", ["C1:D1", "C3:E5"]],
    ["D1:E1", ["D1:E1", "C3:E5"]],
    ["E1:F1", ["C3:E5", "E1:F1"]],
    ["F1:G1", ["C3:E5", "F1:G1"]],
    ["G1:H1", ["C3:E5", "G1:H1"]],
  ])("translation of 2x1 zone (%s) on rowIndex 0 with C3:E5", (zone, result) => {
    expect(recomputeZonesFromXC(["C3:E5", zone], [])).toEqual(result);
    expect(recomputeZonesFromXC([zone, "C3:E5"], [])).toEqual(result);
  });

  test.each([
    ["A1:B2", ["A1:B2", "C3:E5"]],
    ["B1:C2", ["B1:B2", "C1:C5", "D3:E5"]],
    ["C1:D2", ["C1:D5", "E3:E5"]],
    ["D1:E2", ["C3:C5", "D1:E5"]],
    ["E1:F2", ["C3:D5", "E1:E5", "F1:F2"]],
    ["F1:G2", ["C3:E5", "F1:G2"]],
    ["G1:H2", ["C3:E5", "G1:H2"]],
  ])("translation of 2x2 zone (%s) on rowIndex 0 with C3:E5", (zone, result) => {
    expect(recomputeZonesFromXC(["C3:E5", zone], [])).toEqual(result);
    expect(recomputeZonesFromXC([zone, "C3:E5"], [])).toEqual(result);
  });

  test("contiguous cells on the same column", () => {
    const toMerge = [
      "D6",
      "D21",
      "D8",
      "D15",
      "D16",
      "D13",
      "D12",
      "D11",
      "D14",
      "D18",
      "D10",
      "D7",
      "D9",
      "D2",
      "D20",
      "D17",
      "D1",
      "D19",
      "D4",
      "D3",
      "D5",
    ];
    expect(recomputeZonesFromXC(toMerge, [])).toEqual(["D1:D21"]);
  });

  test("contiguous cells on the same row", () => {
    const toMerge = [
      "F1",
      "U1",
      "H1",
      "O1",
      "P1",
      "M1",
      "L1",
      "K1",
      "N1",
      "R1",
      "J1",
      "G1",
      "I1",
      "B1",
      "S1",
      "Q1",
      "A1",
      "T1",
      "D1",
      "C1",
      "E1",
    ];
    expect(recomputeZonesFromXC(toMerge, [])).toEqual(["A1:U1"]);
  });

  test("add a cell to zone(1)", () => {
    const toKeep = ["A1:C3", "A4"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["A1:A4", "B1:C3"]);
  });

  test("add a cell to zone(2)", () => {
    const toKeep = ["A1:C3", "D1"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["A1:C3", "D1"]);
  });

  test("add a cell to a full column zone", () => {
    const toKeep = ["A:B", "A4"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["A:B"]);
  });

  test("add a cell to a full column zone (2)", () => {
    const toKeep = ["A2:A", "A1"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["A:A"]);
  });

  test("add a cell to a full row zone", () => {
    const toKeep = ["1:2", "A1"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["1:2"]);
  });

  test("add a cell to a full row zone (2)", () => {
    const toKeep = ["C1:1", "B1"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["B1:1"]);
  });

  test("add a row to a zone", () => {
    const toKeep = ["A1:C3", "A4:C4"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["A1:C4"]);
  });

  test("add a row to a full row range", () => {
    const toKeep = ["1:1", "2:2"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["1:2"]);
  });

  test("add a col to a zone", () => {
    const toKeep = ["A1:C3", "D1:D3"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["A1:D3"]);
  });

  test("add a col to a full column range", () => {
    const toKeep = ["A2:A", "B2:B"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["A2:B"]);
  });

  test("merge zones", () => {
    const toKeep = ["A1:B3", "B2:C5", "C1:C5"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["A1:A3", "B1:C5"]);
  });
  test("zones included", () => {
    const toKeep = ["A1:D6", "A2:C3"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["A1:D6"]);
  });
  test("remove a cell (1)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["A1"];
    expect(recomputeZonesFromXC(toKeep, toRemove)).toEqual(["A2:A6", "B1:D6"]);
  });
  test("remove a cell (2)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["D6"];
    expect(recomputeZonesFromXC(toKeep, toRemove)).toEqual(["A1:C6", "D1:D5"]);
  });
  test("remove a cell (3)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["B3"];
    expect(recomputeZonesFromXC(toKeep, toRemove)).toEqual(["A1:A6", "B1:B2", "B4:B6", "C1:D6"]);
  });
  test("remove a cell inside a full column range", () => {
    const toKeep = ["A:A"];
    const toRemove = ["A4"];
    expect(recomputeZonesFromXC(toKeep, toRemove)).toEqual(["A1:A3", "A5:A"]);
  });
  test("remove a cell at the top of a full column range", () => {
    const toKeep = ["A:A"];
    const toRemove = ["A1"];
    expect(recomputeZonesFromXC(toKeep, toRemove)).toEqual(["A2:A"]);
  });
  test("remove a cell inside a full row range", () => {
    const toKeep = ["1:1"];
    const toRemove = ["C1"];
    expect(recomputeZonesFromXC(toKeep, toRemove)).toEqual(["A1:B1", "D1:1"]);
  });
  test("remove a cell at the left of a full row range", () => {
    const toKeep = ["1:1"];
    const toRemove = ["A1"];
    expect(recomputeZonesFromXC(toKeep, toRemove)).toEqual(["B1:1"]);
  });

  test("remove a zone", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["B1:C6"];
    expect(recomputeZonesFromXC(toKeep, toRemove)).toEqual(["A1:A6", "D1:D6"]);
  });

  test("remove an unbounded zone", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["2:3"];
    expect(recomputeZonesFromXC(toKeep, toRemove)).toEqual(["A1:D1", "A4:D6"]);
  });

  test("remove an unbounded zone with header", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["B2:3"];
    expect(recomputeZonesFromXC(toKeep, toRemove)).toEqual(["A1:A6", "B1:D1", "B4:D6"]);
  });

  test("merge 4 zones in both directions", () => {
    const toKeep = ["A1", "A2", "B1", "B2"];
    expect(recomputeZonesFromXC(toKeep, [])).toEqual(["A1:B2"]);
  });
});
