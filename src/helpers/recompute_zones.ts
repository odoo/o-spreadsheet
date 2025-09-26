import { deepEqualsArray } from "../helpers/misc";
import { UnboundedZone, Zone } from "../types";

/**
 * ####################################################
 * # INTRODUCTION
 * ####################################################
 *
 * This file contain the function recomputeZones.
 * This function try to recompute in a performant way
 * an ensemble of zones possibly overlapping to avoid
 * overlapping and to reduce the number of zones.
 *
 * It also allows to remove some zones from the ensemble.
 *
 * In the following example, 2 zones are overlapping.
 * Applying recomputeZones will return zones without
 * overlapping:
 *
 * ["B3:D4", "D2:E3"]         ["B3:C4", "D2:D4", "E2:E3"]
 *
 *      A B C D E                    A B C D E
 *    1       ___                  1       ___
 *    2   ___|_  |                 2   ___| | |
 *    3  |   |_|_|      --->       3  |   | |_|
 *    4  |_____|                   4  |___|_|
 *    6                            6
 *    7                            7
 *
 *
 * In the following example, 2 zones are contiguous.
 * Applying recomputeZones will return only one zone:
 *
 *  ["B2:B3", "C2:D3"]               ["B2:D3"]
 *
 *       A B C D E                   A B C D E
 *     1   _ ___                   1   _____
 *     2  | |   |        --->      2  |     |
 *     3  |_|___|                  3  |_____|
 *     4                           4
 *
 *
 * In the following example, we want to remove a zone
 * from the ensemble. Applying recomputeZones will
 * return the ensemble without the zone to remove:
 *
 *    remove ["C3:D3"]           ["B2:B4", "C2:D2",
 *                                "C4:D4", "E2:E4"]
 *
 *       A B C D E F                 A B C D E F
 *     1   _______                 1   _______
 *     2  |       |       --->     2  | |___| |
 *     3  |  xxx  |                3  | |___| |
 *     4  |_______|                4  |_|___|_|
 *     5                           5
 *
 *
 * The exercise seems simple when we have only 2 zones.
 * But with n zones and in a performant way, we want to
 * avoid comparing each zone with all the others.
 *
 *
 * ####################################################
 * # Methodological approach
 * ####################################################
 *
 * The methodological approach to avoid comparing each
 * zone with all the others is to use a data structure
 * that allow to quickly find which zones are
 * overlapping with any other given zone.
 *
 * Here the idea is to profile the zones at the columns level.
 *
 * To do that, we propose to use a data structure
 * composed of 2 parts:
 * - profilesStartingPosition: a sorted number array
 * indicating on which columns a new profile begins.
 * - profiles: a map where the key is a column
 * position (from profilesStartingPosition) and the
 * value is a sorted number array representing a
 * profile.
 *
 *
 * See the following example:    here profileStartingPosition
 *                               corresponds to [A,C,E,G,K]
 *    A B C D E F G H I J K      so with number [0,2,4,6,10]
 *  1    '   '   '       '
 *  2    '   '   '_______'       here profile correspond
 *  3    '___'   |_______|       for A to []
 *  4    |   |                   for C to [3, 5]
 *  5    |___|                   for E to []
 *  6                            for G to [2, 3]
 *  7                            for K to []
 *
 *
 * Now we can easily find which zones are overlapping
 * with a given zone. Suppose we want to add a new zone
 * D5:H6 to the ensemble:
 *
 *                              With a binary search of left and right
 *    A B C D E F G H I J K     on profilesStartingPosition, we can
 *  1    '   '   '       '      find the indexes of the profiles on which
 *  2    '   '   '_______'      to apply a modification.
 *  3    '___'   |_______|
 *  4    |  _|_______           Here we will:
 *  5    |_|_|       |          - add a new profile in D   --> become [3, 6]
 *  6      |_________|          - modify the profile in E  --> become [4, 6]
 *  7                           - modify the profile in G  --> become [2, 3, 4, 6]
 *                              - add a new profile in I   --> become [8, 10]
 *
 *  See below the result:
 *
 *                              Note the particularity of the profile
 *    A B C D E F G H I J K     for G: it will correspond to [2, 3, 4, 6]
 *  1    ' ' '   '   '   '
 *  2    ' ' '   '___'___'      To know how to modify the profile (add a
 *  3    '_'_'   |___|___|      zone or remove it) we do a binary
 *  4    | | |___ ___           search of the top and bottom value on the
 *  5    |_| |   |   |          profile array. Depending on the result index
 *  6      |_|___|___|          parity (odd or even), because zone boundaries
 *  7                           go by pairs, we know if we are in a zone or
 *                              not and how operate.
 */

/**
 * Recompute the zone without the cells in toRemoveZones and avoid overlapping.
 * This compute is particularly useful because after this function:
 * - you will find coordinate of a cell only once among all the zones
 * - the number of zones will be reduced to the minimum
 */
export function recomputeZones<T extends UnboundedZone | Zone>(
  zones: T[],
  zonesToRemove: (UnboundedZone | Zone)[] = []
): T[] {
  if (zones.length <= 1 && zonesToRemove.length === 0) {
    return zones;
  }
  const profilesStartingPosition: number[] = [0];
  const profiles = new Map<number, number[]>([[0, []]]);

  modifyProfiles(profilesStartingPosition, profiles, zones, false);
  modifyProfiles(profilesStartingPosition, profiles, zonesToRemove, true);
  return constructZonesFromProfiles<T>(profilesStartingPosition, profiles);
}

export function modifyProfiles<T extends Zone | UnboundedZone>( // export for testing only
  profilesStartingPosition: number[],
  profiles: Map<number, number[]>,
  zones: T[],
  toRemove: boolean = false
) {
  for (const zone of zones) {
    const leftValue = zone.left;
    const rightValue = zone.right === undefined ? undefined : zone.right + 1;

    const leftIndex = findIndexAndCreateProfile(
      profilesStartingPosition,
      profiles,
      leftValue,
      true,
      0
    );
    const rightIndex = findIndexAndCreateProfile(
      profilesStartingPosition,
      profiles,
      rightValue,
      false,
      leftIndex
    );

    for (let i = leftIndex; i <= rightIndex; i++) {
      const profile = profiles.get(profilesStartingPosition[i])!;
      modifyProfile(profile, zone, toRemove);
    }

    // maybe this part cost in performance, and maybe it's not necessary (depending on the use case). To be checked
    removeContiguousProfiles(profilesStartingPosition, profiles, leftIndex, rightIndex);
  }
}

export function profilesContainsZone(
  profilesStartingPosition: number[],
  profiles: Map<number, number[]>,
  zone: Zone
): boolean {
  const leftValue = zone.left;
  const rightValue = zone.right;
  const topValue = zone.top;
  const bottomValue = zone.bottom + 1;
  const leftIndex = binaryPredecessorSearch(profilesStartingPosition, leftValue, 0);
  const rightIndex = binaryPredecessorSearch(profilesStartingPosition, rightValue, leftIndex);
  if (leftIndex === -1 || rightIndex === -1) {
    return false;
  }
  for (let i = leftIndex; i <= rightIndex; i++) {
    const profile = profiles.get(profilesStartingPosition[i])!;
    const topPredIndex = binaryPredecessorSearch(profile, topValue, 0, true);
    const bottomSuccIndex = binarySuccessorSearch(profile, bottomValue, 0, true);
    if (topPredIndex === -1 || topPredIndex % 2 !== 0) {
      return false;
    }
    if (topValue < profile[topPredIndex] || bottomValue > profile[bottomSuccIndex]) {
      return false;
    }
  }
  return true;
}

export function findIndexAndCreateProfile(
  profilesStartingPosition: number[],
  profiles: Map<number, number[]>,
  value: number | undefined,
  searchLeft: boolean,
  startIndex: number
) {
  if (value === undefined) {
    // this is only the case when the value correspond to a bottom value that could be undefined
    return profilesStartingPosition.length - 1;
  }
  const predecessorIndex = binaryPredecessorSearch(profilesStartingPosition, value, startIndex);
  if (value !== profilesStartingPosition[predecessorIndex]) {
    // mean that the value is not ending/starting at the same position as the previous/next profile
    // --> it's a new profile
    // --> we need to add it
    profilesStartingPosition.splice(predecessorIndex + 1, 0, value);
    // suppose the               we want to add the       for the left value
    // following profile         following zone:          'C', the predecessor index
    //   for B: [1, 3]                "C3:D4"             correspond to 'B'.
    //                                                    The next line code will
    //       A B C D                A B C D               copy the profile of 'B'
    //     1  '___'               1  '___'                to 'C'. In the rest of the
    //     2  |   |       --->    2  |  _|_               process the 'modifyProfile'
    //     3  |___|               3  |_|_| |              function will adapt the waiting
    //     4                      4    |___|              'C' profile [1, 3] to the
    //                                                    correct 'C' profile [1, 4]
    profiles.set(value, [...profiles.get(profilesStartingPosition[predecessorIndex])!]);
    return searchLeft ? predecessorIndex + 1 : predecessorIndex;
  }
  return searchLeft ? predecessorIndex : predecessorIndex - 1;
}

/**
 *  Suppose the following        Suppose we want to add          We want to have the
 *  profile:                     the following zone:             following profile:
 *
 *       A B C D E F                  A B C D E F                     A B C D E F
 *     1    '___'                   1    '   '                      1    '___'
 *     2    |___|                   2    '___'                      2    |   |
 *     3    '   '                   3    |   |                      3    |   |
 *     4    '___'          -->      4    |   |            -->       4    |   |
 *     6    |   |                   6    |___|                      6    |   |
 *     7    |___|                   7                               7    |___|
 *     8                            8                               8
 *
 *  the profile for 'C'          the top zone correspond        Here [2, 3, 5, 8] with [3, 7]
 *  corresponds to:              to 3 and the bottom zone       would be merged into [2, 8]
 *   ____  ____                  correspond to 6
 *  [2, 3, 5, 8]                 would be the profile:          The difficulty of modify profile
 *                                ____                          is to know what must be deleted
 *  Note that the 'filled        [3, 7]                         and what must be added to the
 *  zone' are always between                                    existing profile.
 *  an even index and its
 *  next index
 *
 */

function modifyProfile(
  profile: number[],
  zone: UnboundedZone,
  toRemove: boolean = false
): undefined {
  const topValue = zone.top;
  const bottomValue = zone.bottom === undefined ? undefined : zone.bottom + 1;
  const newPoints: number[] = [];
  // Case we want to add a zone to the profile:
  // - If the top predecessor index `topPredIndex` is even, it means the top of the zone is already positioned on a filled zone
  // so we don't need to add it to the profile. we can keep in reference the index of the predecessor.
  // - If it is odd, it means the top of the zone must be the beginning of a filled zone.
  // so we can keep the index of the top position
  // Case we want to remove a zone from the profile: it's the opposite of the previous case
  const topPredIndex = binaryPredecessorSearch(profile, topValue, 0, false);
  if ((topPredIndex % 2 !== 0 && !toRemove) || (topPredIndex % 2 === 0 && toRemove)) {
    newPoints.push(topValue);
  }

  if (bottomValue === undefined) {
    // The following two code lines will not impact the final result,
    // but they will impact the intermediate profile.
    // We keep them for performance reason
    profile.splice(topPredIndex + 1);
    profile.push(...newPoints);
    return;
  }

  // Case we want to add a zone to the profile:
  // - If the bottom successor index `bottomSuccIndex` is even, it means the bottom of the zone must be the ending of a filled zone
  // so we can keep the index of the bottom position.
  // - If it is odd, it means the bottom of the zone is already positioned on a filled zone
  // so we don't need to add it to the profile. we can keep in reference the index of the successor
  // Case we want to remove a zone from the profile: it's the opposite of the previous case
  const bottomSuccIndex = binarySuccessorSearch(profile, bottomValue, 0, false);
  if ((bottomSuccIndex % 2 === 0 && !toRemove) || (bottomSuccIndex % 2 !== 0 && toRemove)) {
    newPoints.push(bottomValue);
  }

  // add the top and bottom value to the profile and
  // remove all information between the top and bottom index
  const toDelete = bottomSuccIndex - topPredIndex - 1;
  const toInsert = newPoints.length;
  const start = topPredIndex + 1;
  if (start === profile.length - 1 && toDelete === 1 && toInsert === 1) {
    // fast path: we just need to replace the last element
    // equivalent to `else` but faster and without memory allocation
    profile[start] = newPoints[0] ?? newPoints[1];
  } else {
    profile.splice(start, toDelete, ...newPoints);
  }
}

function removeContiguousProfiles(
  profilesStartingPosition: number[],
  profiles: Map<number, number[]>,
  leftIndex: number,
  rightIndex: number
) {
  const start = leftIndex - 1 === -1 ? 0 : leftIndex - 1;
  const end = rightIndex === profilesStartingPosition.length - 1 ? rightIndex : rightIndex + 1;
  for (let i = end; i > start; i--) {
    if (
      deepEqualsArray(
        profiles.get(profilesStartingPosition[i])!,
        profiles.get(profilesStartingPosition[i - 1])!
      )
    ) {
      profiles.delete(profilesStartingPosition[i]);
      profilesStartingPosition.splice(i, 1);
    }
  }
}

export function constructZonesFromProfiles<T extends UnboundedZone | Zone>(
  profilesStartingPosition: number[],
  profiles: Map<number, number[]>
): T[] {
  const mergedZone: T[] = [];
  let pendingZones: T[] = [];
  for (let colIndex = 0; colIndex < profilesStartingPosition.length; colIndex++) {
    const left = profilesStartingPosition[colIndex];
    const profile = profiles.get(left);
    if (!profile || profile.length === 0) {
      mergedZone.push(...pendingZones);
      pendingZones = [];
      continue;
    }

    let right = profilesStartingPosition[colIndex + 1];
    if (right !== undefined) {
      right--;
    }

    const nextPendingZones: T[] = [];
    for (let i = 0; i < profile.length; i += 2) {
      const top = profile[i];
      let bottom = profile[i + 1];
      if (bottom !== undefined) {
        bottom--;
      }
      const profileZone: UnboundedZone = {
        top,
        left,
        bottom,
        right,
      };
      if ((bottom === undefined && top !== 0) || (right === undefined && left !== 0)) {
        profileZone.hasHeader = true;
      }

      let findCorrespondingZone = false;
      for (let j = pendingZones.length - 1; j >= 0; j--) {
        const pendingZone = pendingZones[j];
        if (pendingZone.top === profileZone.top && pendingZone.bottom === profileZone.bottom) {
          pendingZone.right = profileZone.right;
          pendingZones.splice(j, 1);
          nextPendingZones.push(pendingZone);
          findCorrespondingZone = true;
          break;
        }
      }
      if (!findCorrespondingZone) {
        nextPendingZones.push(profileZone as T);
      }
    }

    mergedZone.push(...pendingZones);
    pendingZones = nextPendingZones;
  }
  mergedZone.push(...pendingZones);
  return mergedZone as T[];
}

function binaryPredecessorSearch(arr: number[], val: number, start = 0, matchEqual = true) {
  let end = arr.length - 1;
  let result = -1;

  while (start <= end) {
    const mid = Math.floor((start + end) / 2);
    if (arr[mid] === val && matchEqual) {
      return mid;
    } else if (arr[mid] < val) {
      result = mid;
      start = mid + 1;
    } else {
      end = mid - 1;
    }
  }

  return result;
}

function binarySuccessorSearch(arr: number[], val: number, start = 0, matchEqual = true) {
  let end = arr.length - 1;
  let result = arr.length;
  while (start <= end) {
    const mid = Math.floor((start + end) / 2);
    if (arr[mid] === val && matchEqual) {
      return mid;
    } else if (arr[mid] > val) {
      result = mid;
      end = mid - 1;
    } else {
      start = mid + 1;
    }
  }
  return result;
}
