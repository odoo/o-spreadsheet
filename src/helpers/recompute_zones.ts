import { UnboundedZone } from "../types";

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
 * It also allow to remove some zones from the ensemble.
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
 * But with n zones and in a performant way, We want to
 * avoid to compare each zone with all the others.
 * 
 * 
 * ####################################################
 * # Methodological approach                                     
 * ####################################################
 * 
 * The methodological approach to avoid to compare each
 * zone with all the others is to use a data structure
 * that allow to quickly find which zones are
 * overlapping with a given zone.
 * 
 * Here the idea is to profile the zones at the scale of
 * the columns. 
 * 
 * To do that, we propose to use a data structure 
 * composed of 2 parts:
 * - profilesStartingPosition: a sorted number array 
 * indicating on each column position a profile change.
 * - profiles: a map where the key is the a column
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
 * ["D5:H6"] to the ensemble:                                             
 *                                                                    
 *                              With a binary search of left and right                                                 
 *    A B C D E F G H I J K     on profilesStartingPosition, we can                    
 *  1    '   '   '       '      find the indexes of the profiles on which          
 *  2    '   '   '_______'      apply a modification.                     
 *  3    '___'   |_______|                                                                      
 *  4    |  _|_______           Here we will:                                        
 *  5    |_|_|       |          - add a new profile in D                          
 *  6      |_________|          - modify the profile in E                                 
 *  7                           - modify the profile in G                        
 *                              - add a new profile in I                           
 *                                         
 *  See below the result:
 *                              
 *                              Note the particularity of the profile                                                                    
 *    A B C D E F G H I J K     for G: it will correspond to [2, 3, 4, 6]                   
 *  1    ' ' '   '   '   '                                                         
 *  2    ' ' '   '___'___'      For know how to modify the profile (add a       
 *  3    '_'_'   |___|___|      filled zone or remove it) we do a binary          
 *  4    | | |___ ___           search of the top and bottom value on the        
 *  5    |_| |   |   |          profile array. Function of the result index       
 *  6      |_|___|___|          is odd or even, we know if we are in a           
 *  7                           'filled' zone or not and how operate.                
 *                                                            
 * /


/**
 * Recompute the zone without the cells in toRemoveZones and avoid overlapping.
 * This compute is particularly useful because after this function:
 * - you will find coordinate of a cell only once among all the zones
 * - the number of zones will be reduced to the minimum
 */
export function recomputeZones(
  zones: UnboundedZone[],
  zonesToRemove: UnboundedZone[]
): UnboundedZone[] {
  const profilesStartingPosition: number[] = [0];
  const profiles = new Map<number, number[]>([[0, []]]);

  modifyProfiles(profilesStartingPosition, profiles, zones, false);
  modifyProfiles(profilesStartingPosition, profiles, zonesToRemove, true);
  return constructZonesFromProfiles(profilesStartingPosition, profiles);
}

export function modifyProfiles( // export for testing only
  profilesStartingPosition: number[],
  profiles: Map<number, number[]>,
  zones: UnboundedZone[],
  toRemove: boolean = false
) {
  for (const zone of zones) {
    const leftValue = zone.left;
    const rightValue = zone.right === undefined ? undefined : zone.right + 1;

    ///////////////////////////////////////////////////////////////////////////////
    // FIND LEFT POINT ////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////

    let leftPredecessorProfileIndex = binaryPredecessorSearch(profilesStartingPosition, leftValue);

    // leftValue is potentially a new interesting position in which can start a new profile
    // we momentarily add them among the profiles to be able to easily find them and work with them later

    profiles.set(leftValue, [
      ...profiles.get(profilesStartingPosition[leftPredecessorProfileIndex])!,
    ]);

    // now we looking for the indexes of the profiles on which apply a modification
    // all this indexes are positioned after a leftIndex.

    let leftIndex = leftPredecessorProfileIndex;
    if (leftValue != profilesStartingPosition[leftPredecessorProfileIndex]) {
      // mean that the zone is not starting at the same position as the previous profile
      // --> it's a new profile
      // --> we need to add it
      profilesStartingPosition.splice(leftPredecessorProfileIndex + 1, 0, leftValue);
      leftIndex++;
    }

    ///////////////////////////////////////////////////////////////////////////////
    // FIND RIGHT POINT ///////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////

    let rightPredecessorProfileIndex =
      rightValue === undefined
        ? profilesStartingPosition.length - 1
        : binaryPredecessorSearch(
            profilesStartingPosition,
            rightValue,
            leftPredecessorProfileIndex
          );

    // rightValue are potentially a new interesting position in which can start a new profile
    // we momentarily add them among the profiles to be able to easily find them and work with them later

    if (rightValue !== undefined) {
      profiles.set(rightValue, [
        ...profiles.get(profilesStartingPosition[rightPredecessorProfileIndex])!,
      ]);
    }

    // now we looking for the indexes of the profiles on which apply a modification
    // all this indexes are positioned before a rightIndex

    let rightIndex = rightPredecessorProfileIndex;
    if (rightValue !== undefined) {
      if (rightValue !== profilesStartingPosition[rightPredecessorProfileIndex]) {
        // mean that the zone is not ending at the same position as the previous profile
        // --> it's a new profile
        // --> we need to add it
        profilesStartingPosition.splice(rightPredecessorProfileIndex + 1, 0, rightValue);
      } else {
        rightIndex--;
      }
    }

    ///////////////////////////////////////////////////////////////////////////////
    // MODIFY PROFILES ////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////

    for (let i = leftIndex; i <= rightIndex; i++) {
      const profile = profiles.get(profilesStartingPosition[i])!;
      modifyProfile(profile, zone, toRemove);
    }

    ///////////////////////////////////////////////////////////////////////////////
    // REMOVE SAME CONTIGUOUS PROFILES ////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////

    // maybe this part cost in performance, and maybe it's not necessary (depending on the use case). To be checked
    for (
      let i = rightIndex === profilesStartingPosition.length - 1 ? rightIndex : rightIndex + 1;
      i > (leftIndex - 1 === -1 ? 0 : leftIndex - 1);
      i--
    ) {
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
}

/**
 *  Suppose the following        Suppose we want to add        The purpose of this function
 *  profile:                     the following zone:           is to take the profile of
 *                                                             the new zone and merge it
 *       A B C D E F                  A B C D E F              with the existing profile.
 *     1    '___'                   1    '   '
 *     2    |___|                   2    '___'                 Here [2, 3, 5, 8] with [3, 7]
 *     3    '   '                   3    |   |                 would be merged into [2, 8]
 *     4    '___'          -->      4    |   |            -->
 *     6    |   |                   6    |___|                 The difficulty of this function
 *     7    |___|                   7                          is to know what must be deleted
 *     8                            8                          and what must be added to the profile
 *
 *  the profile for 'C'          the top zone correspond
 *  corresponds to:              to 3 and the bottom zone
 *   ____  ____                  correspond to 6
 *  [2, 3, 5, 8]                 would be the profile:
 *                                ____
 *  Note that the 'filled        [3, 7]
 *  zone' are always between
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
  // - If the top predecessor index is even, it means that the top of the zone is already positioned on a filled zone
  // so we don't need to add it to the profile. we can keep in reference the index of the predecessor.
  // - If it is odd, it means that the top of the zone must be the beginning of a filled zone.
  // so we can keep the index of the top position
  // Case we want to remove a zone from the profile: it's the opposite of the previous case
  const topPredIndex = binaryPredecessorSearch(profile, topValue, 0, false);
  if ((topPredIndex % 2 !== 0 && !toRemove) || (topPredIndex % 2 === 0 && toRemove)) {
    newPoints.push(topValue);
  }

  if (bottomValue === undefined) {
    profile.splice(topPredIndex + 1);
    profile.push(...newPoints);
    return;
  }

  // Case we want to add a zone to the profile:
  // - If the bottom successor index is even, it means that the bottom of the zone must be the ending of a filled zone
  // so we can keep the index of the bottom position.
  // - If it is odd, it means that the bottom of the zone is already positioned on a filled zone
  // so we don't need to add it to the profile. we can keep in reference the index of the successor
  // Case we want to remove a zone from the profile: it's the opposite of the previous case
  const bottomSuccIndex = binarySuccessorSearch(profile, bottomValue, 0, false);
  if ((bottomSuccIndex % 2 === 0 && !toRemove) || (bottomSuccIndex % 2 !== 0 && toRemove)) {
    newPoints.push(bottomValue);
  }

  // add the top and bottom value to the profile and
  // remove all information between the top and bottom index
  profile.splice(topPredIndex + 1, bottomSuccIndex - topPredIndex - 1, ...newPoints);
}

function constructZonesFromProfiles(
  profilesStartingPosition: number[],
  profiles: Map<number, number[]>
): UnboundedZone[] {
  const mergedZone: UnboundedZone[] = [];
  let stackZones: UnboundedZone[] = [];
  for (let colIndex = 0; colIndex < profilesStartingPosition.length; colIndex++) {
    const left = profilesStartingPosition[colIndex];
    const profile = profiles.get(left)!;
    if (!profile || profile.length === 0) {
      mergedZone.push(...stackZones);
      stackZones = [];
      continue;
    }

    let right = profilesStartingPosition[colIndex + 1];
    if (right !== undefined) {
      right--;
    }

    const colZones: UnboundedZone[] = [];
    for (let i = 0; i < profile.length; i += 2) {
      const top = profile[i];
      let bottom = profile[i + 1];
      if (bottom !== undefined) {
        bottom--;
      }
      const colZone: UnboundedZone = { top, left, bottom, right };

      let findCorrespondingZone = false;
      for (let j = stackZones.length - 1; j >= 0; j--) {
        const stackZone = stackZones[j];
        if (stackZone.top === colZone.top && stackZone.bottom === colZone.bottom) {
          stackZone.right = colZone.right;
          stackZones.splice(j, 1);
          colZones.push(stackZone);
          findCorrespondingZone = true;
          continue;
        }
      }
      if (!findCorrespondingZone) {
        colZones.push(colZone);
      }
    }

    mergedZone.push(...stackZones);
    stackZones = colZones;
  }
  mergedZone.push(...stackZones);
  return mergedZone;
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

function deepEqualsArray(arr1: number[], arr2: number[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}
