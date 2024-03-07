import { modifyProfiles, recomputeZones2, toUnboundedZone, zoneToXc } from "../../src/helpers";

const recomputeZones2FromXC = function (xcs: string[], xcsToRemove: string[]): string[] {
  return recomputeZones2(xcs.map(toUnboundedZone), xcsToRemove.map(toUnboundedZone)).map(zoneToXc);
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

describe("modifyProfiles", () => {
  test("test modifyProfiles", () => {
    let conf1 = ["C3:E5"];
    let conf2: string[] = [];
    let result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, []],
    ]);

    expect(computeProfiles(conf1, [])).toEqual(result);

    // ///////////////////////////////////////
    // translation de 2x1 sur row 0 avec C3:E5
    // ///////////////////////////////////////

    conf1 = ["A1:B1", "C3:E5"];
    conf2 = ["C3:E5", "A1:B1"];
    result = new Map<number, number[]>([
      [0, [0, 1]],
      [2, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["B1:C1", "C3:E5"];
    conf2 = ["C3:E5", "B1:C1"];
    result = new Map<number, number[]>([
      [0, []],
      [1, [0, 1]],
      [2, [0, 1, 2, 5]],
      [3, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["C1:D1", "C3:E5"];
    conf2 = ["C3:E5", "C1:D1"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [0, 1, 2, 5]],
      [4, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["D1:E1", "C3:E5"];
    conf2 = ["C3:E5", "D1:E1"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [3, [0, 1, 2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["E1:F1", "C3:E5"];
    conf2 = ["C3:E5", "E1:F1"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [4, [0, 1, 2, 5]],
      [5, [0, 1]],
      [6, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["F1:G1", "C3:E5"];
    conf2 = ["C3:E5", "F1:G1"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, [0, 1]],
      [7, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["G1:H1", "C3:E5"];
    conf2 = ["C3:E5", "G1:H1"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, []],
      [6, [0, 1]],
      [8, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    // ///////////////////////////////////////
    // translation de 2x2 sur row 0 avec C3:E5
    // ///////////////////////////////////////

    conf1 = ["A1:B2", "C3:E5"];
    conf2 = ["C3:E5", "A1:B2"];
    result = new Map<number, number[]>([
      [0, [0, 2]],
      [2, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["B1:C2", "C3:E5"];
    conf2 = ["C3:E5", "B1:C2"];
    result = new Map<number, number[]>([
      [0, []],
      [1, [0, 2]],
      [2, [0, 5]],
      [3, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["C1:D2", "C3:E5"];
    conf2 = ["C3:E5", "C1:D2"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [0, 5]],
      [4, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["D1:E2", "C3:E5"];
    conf2 = ["C3:E5", "D1:E2"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [3, [0, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["E1:F2", "C3:E5"];
    conf2 = ["C3:E5", "E1:F2"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [4, [0, 5]],
      [5, [0, 2]],
      [6, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["F1:G2", "C3:E5"];
    conf2 = ["C3:E5", "F1:G2"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, [0, 2]],
      [7, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["G1:H2", "C3:E5"];
    conf2 = ["C3:E5", "G1:H2"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, []],
      [6, [0, 2]],
      [8, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    // ///////////////////////////////////////
    // translation de 2x2 sur row 1 avec C3:E5
    // ///////////////////////////////////////

    conf1 = ["A2:B3", "C3:E5"];
    conf2 = ["C3:E5", "A2:B3"];
    result = new Map<number, number[]>([
      [0, [1, 3]],
      [2, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["B2:C3", "C3:E5"];
    conf2 = ["C3:E5", "B2:C3"];
    result = new Map<number, number[]>([
      [0, []],
      [1, [1, 3]],
      [2, [1, 5]],
      [3, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["C2:D3", "C3:E5"];
    conf2 = ["C3:E5", "C2:D3"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [1, 5]],
      [4, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["D2:E3", "C3:E5"];
    conf2 = ["C3:E5", "D2:E3"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [3, [1, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["E2:F3", "C3:E5"];
    conf2 = ["C3:E5", "E2:F3"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [4, [1, 5]],
      [5, [1, 3]],
      [6, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["F2:G3", "C3:E5"];
    conf2 = ["C3:E5", "F2:G3"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, [1, 3]],
      [7, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["G2:H3", "C3:E5"];
    conf2 = ["C3:E5", "G2:H3"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, []],
      [6, [1, 3]],
      [8, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    // ///////////////////////////////////////
    // translation de 2x2 sur row 2 avec C3:E5
    // ///////////////////////////////////////

    conf1 = ["A3:B4", "C3:E5"];
    conf2 = ["C3:E5", "A3:B4"];
    result = new Map<number, number[]>([
      [0, [2, 4]],
      [2, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["B3:C4", "C3:E5"];
    conf2 = ["C3:E5", "B3:C4"];
    result = new Map<number, number[]>([
      [0, []],
      [1, [2, 4]],
      [2, [2, 5]],
      // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [3, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["C3:D4", "C3:E5"];
    conf2 = ["C3:E5", "C3:D4"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [4, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["D3:E4", "C3:E5"];
    conf2 = ["C3:E5", "D3:E4"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [3, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["E3:F4", "C3:E5"];
    conf2 = ["C3:E5", "E3:F4"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [4, [2, 5]],
      [5, [2, 4]],
      [6, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["F3:G4", "C3:E5"];
    conf2 = ["C3:E5", "F3:G4"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, [2, 4]],
      [7, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["G3:H4", "C3:E5"];
    conf2 = ["C3:E5", "G3:H4"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, []],
      [6, [2, 4]],
      [8, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    // ///////////////////////////////////////
    // translation de 2x2 sur row 3 avec C3:E5
    // ///////////////////////////////////////

    conf1 = ["A4:B5", "C3:E5"];
    conf2 = ["C3:E5", "A4:B5"];
    result = new Map<number, number[]>([
      [0, [3, 5]],
      [2, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["B4:C5", "C3:E5"];
    conf2 = ["C3:E5", "B4:C5"];
    result = new Map<number, number[]>([
      [0, []],
      [1, [3, 5]],
      [2, [2, 5]],
      // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [3, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["C4:D5", "C3:E5"];
    conf2 = ["C3:E5", "C4:D5"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [4, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["D4:E5", "C3:E5"];
    conf2 = ["C3:E5", "D4:E5"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [3, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["E4:F5", "C3:E5"];
    conf2 = ["C3:E5", "E4:F5"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      // WITHOUT REMOVE SAME CONTIGUOUS PROFILES [4, [2, 5]],
      [5, [3, 5]],
      [6, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["F4:G5", "C3:E5"];
    conf2 = ["C3:E5", "F4:G5"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, [3, 5]],
      [7, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["G4:H5", "C3:E5"];
    conf2 = ["C3:E5", "G4:H5"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, []],
      [6, [3, 5]],
      [8, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    // ///////////////////////////////////////
    // translation de 2x2 sur row 4 avec C3:E5
    // ///////////////////////////////////////

    conf1 = ["A5:B6", "C3:E5"];
    conf2 = ["C3:E5", "A5:B6"];
    result = new Map<number, number[]>([
      [0, [4, 6]],
      [2, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["B5:C6", "C3:E5"];
    conf2 = ["C3:E5", "B5:C6"];
    result = new Map<number, number[]>([
      [0, []],
      [1, [4, 6]],
      [2, [2, 6]],
      [3, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["C5:D6", "C3:E5"];
    conf2 = ["C3:E5", "C5:D6"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 6]],
      [4, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["D5:E6", "C3:E5"];
    conf2 = ["C3:E5", "D5:E6"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [3, [2, 6]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["E5:F6", "C3:E5"];
    conf2 = ["C3:E5", "E5:F6"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [4, [2, 6]],
      [5, [4, 6]],
      [6, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["F5:G6", "C3:E5"];
    conf2 = ["C3:E5", "F5:G6"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, [4, 6]],
      [7, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["G5:H6", "C3:E5"];
    conf2 = ["C3:E5", "G5:H6"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, []],
      [6, [4, 6]],
      [8, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    // ///////////////////////////////////////
    // translation de 2x2 sur row 5 avec C3:E5
    // ///////////////////////////////////////

    conf1 = ["A6:B7", "C3:E5"];
    conf2 = ["C3:E5", "A6:B7"];
    result = new Map<number, number[]>([
      [0, [5, 7]],
      [2, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["B6:C7", "C3:E5"];
    conf2 = ["C3:E5", "B6:C7"];
    result = new Map<number, number[]>([
      [0, []],
      [1, [5, 7]],
      [2, [2, 7]],
      [3, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["C6:D7", "C3:E5"];
    conf2 = ["C3:E5", "C6:D7"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 7]],
      [4, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["D6:E7", "C3:E5"];
    conf2 = ["C3:E5", "D6:E7"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [3, [2, 7]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["E6:F7", "C3:E5"];
    conf2 = ["C3:E5", "E6:F7"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [4, [2, 7]],
      [5, [5, 7]],
      [6, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["F6:G7", "C3:E5"];
    conf2 = ["C3:E5", "F6:G7"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, [5, 7]],
      [7, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["G6:H7", "C3:E5"];
    conf2 = ["C3:E5", "G6:H7"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, []],
      [6, [5, 7]],
      [8, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    // ///////////////////////////////////////
    // translation de 2x2 sur row 6 avec C3:E5
    // ///////////////////////////////////////

    conf1 = ["A7:B8", "C3:E5"];
    conf2 = ["C3:E5", "A7:B8"];
    result = new Map<number, number[]>([
      [0, [6, 8]],
      [2, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["B7:C8", "C3:E5"];
    conf2 = ["C3:E5", "B7:C8"];
    result = new Map<number, number[]>([
      [0, []],
      [1, [6, 8]],
      [2, [2, 5, 6, 8]],
      [3, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["C7:D8", "C3:E5"];
    conf2 = ["C3:E5", "C7:D8"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5, 6, 8]],
      [4, [2, 5]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["D7:E8", "C3:E5"];
    conf2 = ["C3:E5", "D7:E8"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [3, [2, 5, 6, 8]],
      [5, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["E7:F8", "C3:E5"];
    conf2 = ["C3:E5", "E7:F8"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [4, [2, 5, 6, 8]],
      [5, [6, 8]],
      [6, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["F7:G8", "C3:E5"];
    conf2 = ["C3:E5", "F7:G8"];
    result = new Map<number, number[]>([
      [0, []],
      [2, [2, 5]],
      [5, [6, 8]],
      [7, []],
    ]);
    expect(computeProfiles(conf1, [])).toEqual(result);
    expect(computeProfiles(conf2, [])).toEqual(result);

    conf1 = ["G7:H8", "C3:E5"];
    conf2 = ["C3:E5", "G7:H8"];
    result = new Map<number, number[]>([
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

describe("recomputeZones new tests", () => {
  test("on a simple zone", () => {
    const conf1 = ["A1:B1"];
    expect(recomputeZones2FromXC(conf1, [])).toEqual(conf1);
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
    expect(recomputeZones2FromXC(["C3:E5", zone], [])).toEqual(result);
    expect(recomputeZones2FromXC([zone, "C3:E5"], [])).toEqual(result);
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
    expect(recomputeZones2FromXC(["C3:E5", zone], [])).toEqual(result);
    expect(recomputeZones2FromXC([zone, "C3:E5"], [])).toEqual(result);
  });

  test("testtesttest", () => {
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
    expect(recomputeZones2FromXC(toMerge, [])).toEqual(["D1:D21"]);
  });
});

describe("recomputeZones old tests", () => {
  test("add a cell to zone(1)", () => {
    const toKeep = ["A1:C3", "A4"];
    const expectedZone = ["A1:A4", "B1:C3"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });

  test("add a cell to zone(2)", () => {
    const toKeep = ["A1:C3", "D1"];
    const expectedZone = ["A1:C3", "D1"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });

  test("add a cell to a full column zone", () => {
    const toKeep = ["A:B", "A4"];
    const expectedZone = ["A:B"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });

  test("add a cell to a full column zone (2)", () => {
    const toKeep = ["A2:A", "A1"];
    const expectedZone = ["A:A"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });

  test("add a cell to a full row zone", () => {
    const toKeep = ["1:2", "A1"];
    const expectedZone = ["1:2"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });

  test("add a cell to a full row zone (2)", () => {
    const toKeep = ["C1:1", "B1"];
    const expectedZone = ["B1:1"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });

  test("add a row to a zone", () => {
    const toKeep = ["A1:C3", "A4:C4"];
    const expectedZone = ["A1:C4"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });

  test("add a row to a full row range", () => {
    const toKeep = ["1:1", "2:2"];
    const expectedZone = ["1:2"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });

  test("add a col to a zone", () => {
    const toKeep = ["A1:C3", "D1:D3"];
    const expectedZone = ["A1:D3"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });

  test("add a col to a full column range", () => {
    const toKeep = ["A2:A", "B2:B"];
    const expectedZone = ["A2:B"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });

  test("merge zones", () => {
    const toKeep = ["A1:B3", "B2:C5", "C1:C5"];
    const expectedZone = ["A1:A3", "B1:C5"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });
  test("zones included", () => {
    const toKeep = ["A1:D6", "A2:C3"];
    const expectedZone = ["A1:D6"];
    expect(recomputeZones2FromXC(toKeep, [])).toEqual(expectedZone);
  });
  test("remove a cell (1)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["A1"];
    const expectedZone = ["A2:A6", "B1:D6"];
    expect(recomputeZones2FromXC(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a cell (2)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["D6"];
    const expectedZone = ["A1:C6", "D1:D5"];
    expect(recomputeZones2FromXC(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a cell (3)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["B3"];
    const expectedZone = ["A1:A6", "B1:B2", "B4:B6", "C1:D6"];
    expect(recomputeZones2FromXC(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a cell inside a full column range", () => {
    const toKeep = ["A:A"];
    const toRemove = ["A4"];
    const expectedZone = ["A1:A3", "A5:A"];
    expect(recomputeZones2FromXC(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a cell at the top of a full column range", () => {
    const toKeep = ["A:A"];
    const toRemove = ["A1"];
    const expectedZone = ["A2:A"];
    expect(recomputeZones2FromXC(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a cell inside a full row range", () => {
    const toKeep = ["1:1"];
    const toRemove = ["C1"];
    const expectedZone = ["A1:B1", "D1:1"];
    expect(recomputeZones2FromXC(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a cell at the left of a full row range", () => {
    const toKeep = ["1:1"];
    const toRemove = ["A1"];
    const expectedZone = ["B1:1"];
    expect(recomputeZones2FromXC(toKeep, toRemove)).toEqual(expectedZone);
  });

  test("remove a zone", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["B1:C6"];
    const expectedZone = ["A1:A6", "D1:D6"];
    expect(recomputeZones2FromXC(toKeep, toRemove)).toEqual(expectedZone);
  });

  test("remove an unbounded zone", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["2:3"];
    const expectedZone = ["A1:D1", "A4:D6"];
    expect(recomputeZones2FromXC(toKeep, toRemove)).toEqual(expectedZone);
  });
});
