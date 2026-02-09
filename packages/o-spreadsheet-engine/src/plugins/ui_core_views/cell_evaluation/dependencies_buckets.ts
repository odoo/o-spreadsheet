import { CellPosition, Zone } from "../../..";
import { positionToZone } from "../../../helpers/zones";
import { BoundedRange } from "../../../types/range";
import { RangeSet } from "./range_set";

// Bucket Shape: 64 columns x 512 rows
const SHIFT_Y = 9; // 2^9 = 512 rows
const SHIFT_X = 6; // 2^6 = 64 cols

// Threshold for "Huge" ranges (bypass grid)
// If a range spans > 16 buckets (~8192 rows or ~1024 cols), it goes to global list
const HUGE_THRESHOLD = 16; // probably too small

// Max constants for Infinite Ranges (A:A or 1:1)
const MAX_ROW_LIMIT = 1_000_000;
const MAX_COL_LIMIT = 16_384;

type BucketId = number; // Packed (Y << 16) | X
type GroupId = number; // Unique ID for each source range group

export class DependencyGraph {
  private grid: Map<BucketId, GroupId[]>;
  private globalCols: GroupId[];
  private globalRows: GroupId[];
  private globalHuge: GroupId[];
  private registry: Map<string, GroupId>;
  private groupSources: Map<GroupId, Zone>;
  private groupDependents: Map<GroupId, RangeSet>;
  private groupQueryIds: Map<GroupId, number>;
  private nextGroupId: number;
  private currentQueryId: number;
  constructor() {
    // 1. Spatial Index (Buckets)
    this.grid = new Map();

    // 2. Global Lists (Optimization for massive ranges)
    this.globalCols = []; // For A:A
    this.globalRows = []; // For 1:1
    this.globalHuge = []; // For A1:Z10000

    // 3. Canonical Registry
    // Maps "top,left,bottom,right" -> GroupID
    this.registry = new Map();

    // 4. Data Storage (Structure of Arrays)
    this.nextGroupId = 1;
    // ID -> Zone
    this.groupSources = new Map();
    // ID -> RangeSet
    this.groupDependents = new Map();
    // ID -> Int (Timestamp for deduplication)
    this.groupQueryIds = new Map();

    // Rolling query ID for O(1) deduplication
    this.currentQueryId = 0;
  }

  /**
   * Register that cell [depRow, depCol] depends on range [srcR1:srcC1] to [srcR2:srcC2]
   */
  addDependency(formulaPosition: CellPosition, dependendyZone: Zone) {
    // 1. Get or Create the Canonical Group for this source range
    // We use a string key for the unique range.
    // Optimization note: For extreme perf, you can use a custom 128-bit hash.
    const { top, bottom, left, right } = dependendyZone;
    const key = `${top},${left},${bottom},${right}`;
    let groupId = this.registry.get(key);

    if (groupId === undefined) {
      groupId = this.createGroup(dependendyZone);
    }
    this.groupDependents.get(groupId)?.add({
      sheetId: formulaPosition.sheetId,
      zone: positionToZone(formulaPosition),
    });
  }

  /**
   * Find which dependency groups overlap with the changed zone
   * Returns array of Group Objects: { id, source, dependents }
   */
  getRangeDependents(zone: Zone): BoundedRange[] {
    const { top, left, bottom, right } = zone;
    const affectedGroups: BoundedRange[] = [];

    // Increment query ID to invalidate old "visited" markers
    this.currentQueryId++;
    const queryId = this.currentQueryId;

    // A. Check Spatial Grid (The 99% case)
    const startBY = top >> SHIFT_Y;
    const endBY = bottom >> SHIFT_Y;
    const startBX = left >> SHIFT_X;
    const endBX = right >> SHIFT_X;

    for (let by = startBY; by <= endBY; by++) {
      for (let bx = startBX; bx <= endBX; bx++) {
        const bucketId = (by << 16) | bx;
        const bucket = this.grid.get(bucketId);

        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            const groupId = bucket[i];
            this.checkAndAdd(groupId, zone, queryId, affectedGroups);
          }
        }
      }
    }

    // B. Check Global Lists (The Edge Cases)
    // 1. Global Columns (e.g. A:A) - Check overlap with Query Columns
    for (let i = 0; i < this.globalCols.length; i++) {
      const groupId = this.globalCols[i];
      // Optimization: Only check Column intersection for Col-Global items
      const src = this.groupSources.get(groupId);
      if (src && src.left <= right && src.right >= left) {
        this.checkAndAdd(groupId, zone, queryId, affectedGroups, true);
      }
    }

    // 2. Global Rows (e.g. 1:1) - Check overlap with Query Rows
    for (let i = 0; i < this.globalRows.length; i++) {
      const groupId = this.globalRows[i];
      const src = this.groupSources.get(groupId);
      if (src && src.top <= bottom && src.bottom >= top) {
        this.checkAndAdd(groupId, zone, queryId, affectedGroups, true);
      }
    }

    // 3. Global Huge Rectangles - Full Check
    for (let i = 0; i < this.globalHuge.length; i++) {
      this.checkAndAdd(this.globalHuge[i], zone, queryId, affectedGroups);
    }

    return affectedGroups;
  }

  createGroup(zone: Zone): GroupId {
    const groupId = this.nextGroupId++;

    // Store Source
    this.groupSources.set(groupId, zone);
    this.groupDependents.set(groupId, new RangeSet());
    this.groupQueryIds.set(groupId, 0);

    // Register Key
    const key = `${zone.top},${zone.left},${zone.bottom},${zone.right}`;
    this.registry.set(key, groupId);

    // Decide where to store it (Grid vs Global)
    this.routeToStorage(groupId, zone);

    return groupId;
  }

  private routeToStorage(groupId: GroupId, zone: Zone) {
    const { top, left, bottom, right } = zone;
    const spanY = (bottom >> SHIFT_Y) - (top >> SHIFT_Y);
    const spanX = (right >> SHIFT_X) - (left >> SHIFT_X);

    // 1. Infinite Column (e.g. A:A)
    if (top === 0 && bottom >= MAX_ROW_LIMIT) {
      this.globalCols.push(groupId);
      return;
    }

    // 2. Infinite Row (e.g. 1:1)
    if (left === 0 && right >= MAX_COL_LIMIT) {
      this.globalRows.push(groupId);
      return;
    }

    // 3. Huge Range (Too big for grid)
    if (spanY > HUGE_THRESHOLD || spanX > HUGE_THRESHOLD) {
      this.globalHuge.push(groupId);
      return;
    }

    // 4. Standard Spatial Grid
    this.insertIntoGrid(groupId, zone);
  }

  private insertIntoGrid(groupId: GroupId, zone: Zone) {
    const { top, left, bottom, right } = zone;
    const startY = top >> SHIFT_Y;
    const endY = bottom >> SHIFT_Y;
    const startX = left >> SHIFT_X;
    const endX = right >> SHIFT_X;
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        // Pack coordinates: 16 bits Y | 16 bits X
        const bucketId = (y << 16) | x;

        let bucket = this.grid.get(bucketId);
        if (!bucket) {
          bucket = [];
          this.grid.set(bucketId, bucket);
        }
        bucket.push(groupId);
      }
    }
  }

  private checkAndAdd(
    groupId: GroupId,
    { top, left, bottom, right }: Zone,
    queryId: number,
    results: BoundedRange[],
    skipIntersectionCheck = false
  ) {
    // 1. Deduplication
    // If a group appears in multiple buckets, we only want to process it once per query
    if (this.groupQueryIds.get(groupId) === queryId) {
      return; // Already visited in this query
    }

    // Mark as visited for this query
    this.groupQueryIds.set(groupId, queryId);

    // 2. Intersection Check
    const src = this.groupSources.get(groupId);

    // If we came from a Global List known to overlap, skip check
    let isHit = skipIntersectionCheck;

    if (!isHit) {
      // Standard AABB Intersection
      if (src && src.top <= bottom && src.bottom >= top && src.left <= right && src.right >= left) {
        isHit = true;
      }
    }

    if (isHit) {
      results.push(...(this.groupDependents.get(groupId) ?? []));
    }
  }
}
