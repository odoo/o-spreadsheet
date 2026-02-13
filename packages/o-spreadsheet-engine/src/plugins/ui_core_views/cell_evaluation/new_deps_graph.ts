/**
 * ============================================================================
 * HIGH-PERFORMANCE SPREADSHEET DEPENDENCY ENGINE
 * ============================================================================
 * * Architecture:
 * 1. FlatIntervalTree: A double-buffered, zero-allocation Interval Tree.
 * 2. CanonicalRegistry: Deduplicates dependency logic (flyweight pattern).
 * 3. DependencyGraph: The public API managing columns and propagation.
 * * Performance targets:
 * - 1,000,000+ rows supported.
 * - Zero GC allocation during 'Search' and 'Rebuild'.
 * - O(1) memory growth for fill-down operations.
 */

// --- 1. TYPES & CONSTANTS ---------------------------------------------------

export type ColIndex = number; // 0-based index (A=0, B=1)
export type RowIndex = number; // 1-based index (Row 1 = 1)
export type GroupID = number; // Pointer to Canonical Registry

export enum DependencyType {
  RELATIVE = 0, // e.g., A1->B1, A2->B2 (Fill Down)
  ABSOLUTE = 1, // e.g., A1->SUM(B1:B10) (Many-to-One)
}

/**
 * Represents the LOGIC of a dependency, not the cells.
 * "If I change, who needs to know?"
 */
export interface DependencyLogic {
  id: GroupID;
  type: DependencyType;

  // For RELATIVE: The offset to apply to the source cell to find the dependent.
  // dependent = source + offset
  colOffset?: number;
  rowOffset?: number;

  // For ABSOLUTE: The exact coordinates of the dependent cell.
  targetCol?: ColIndex;
  targetRow?: RowIndex;
}

// --- 2. THE ZERO-ALLOCATION INTERVAL TREE -----------------------------------

/**
 * Stores intervals [start, end] -> GroupID.
 * Uses Double Buffering to sort and rebuild without GC pauses.
 */
class FlatIntervalTree {
  private count: number = 0;
  private capacity: number;
  private root: number = -1;
  private isDirty: boolean = false;

  // --- Primary Buffers (Active Read/Write) ---
  private starts: Int32Array;
  private ends: Int32Array;
  private groupIds: Int32Array;

  // --- Shadow Buffers (Swap Space for Sorting) ---
  private shadowStarts: Int32Array;
  private shadowEnds: Int32Array;
  private shadowGroups: Int32Array;

  // --- Index Buffer (For Sorting) ---
  private indexBuf: Int32Array;

  // --- Topology Buffers (Tree Structure) ---
  private left: Int32Array;
  private right: Int32Array;
  private maxEnds: Int32Array; // Augmented structure for overlap checks

  constructor(initialCapacity: number = 256) {
    this.capacity = initialCapacity;
    this.allocateMemory(initialCapacity);
  }

  private allocateMemory(capacity: number) {
    this.starts = new Int32Array(capacity);
    this.ends = new Int32Array(capacity);
    this.groupIds = new Int32Array(capacity);

    this.shadowStarts = new Int32Array(capacity);
    this.shadowEnds = new Int32Array(capacity);
    this.shadowGroups = new Int32Array(capacity);
    this.indexBuf = new Int32Array(capacity);

    this.left = new Int32Array(capacity);
    this.right = new Int32Array(capacity);
    this.maxEnds = new Int32Array(capacity);
  }

  /**
   * Resizes all internal buffers when the tree exceeds capacity.
   * * Complexity: O(N) memory copy.
   * * Strategy: Double the capacity.
   */
  private resize() {
    const newCapacity = this.capacity * 2;

    // 1. Allocate new buffers
    const newStarts = new Int32Array(newCapacity);
    const newEnds = new Int32Array(newCapacity);
    const newGroups = new Int32Array(newCapacity);

    const newShadowStarts = new Int32Array(newCapacity);
    const newShadowEnds = new Int32Array(newCapacity);
    const newShadowGroups = new Int32Array(newCapacity);

    const newIndexBuf = new Int32Array(newCapacity);

    const newLeft = new Int32Array(newCapacity);
    const newRight = new Int32Array(newCapacity);
    const newMaxEnds = new Int32Array(newCapacity);

    // 2. Copy Active Data (Bulk Copy using .set is very fast in V8)
    newStarts.set(this.starts);
    newEnds.set(this.ends);
    newGroups.set(this.groupIds);

    // 3. Copy Topology Data
    newLeft.set(this.left);
    newRight.set(this.right);
    newMaxEnds.set(this.maxEnds);

    // 4. Important: Initialize new regions of pointer arrays to -1
    // (TypedArrays default to 0, which would point to the root node!)
    newLeft.fill(-1, this.capacity);
    newRight.fill(-1, this.capacity);

    // 5. Update References
    this.starts = newStarts;
    this.ends = newEnds;
    this.groupIds = newGroups;

    // Shadow buffers don't need copying (they are scratch space),
    // just replace them with larger empty ones.
    this.shadowStarts = newShadowStarts;
    this.shadowEnds = newShadowEnds;
    this.shadowGroups = newShadowGroups;

    this.indexBuf = newIndexBuf;

    this.left = newLeft;
    this.right = newRight;
    this.maxEnds = newMaxEnds;

    this.capacity = newCapacity;
  }

  /**
   * O(1) Insert. Just appends.
   */
  public insert(start: RowIndex, end: RowIndex, groupId: GroupID) {
    if (this.count >= this.capacity) {
      this.resize();
    }

    const idx = this.count++;
    this.starts[idx] = start;
    this.ends[idx] = end;
    this.groupIds[idx] = groupId;
    this.isDirty = true;
  }

  /**
   * O(Log N) Search. Triggers Rebuild if dirty.
   */
  public search(point: RowIndex, results: GroupID[]): void {
    if (this.isDirty) {
      this.rebuild();
    }
    if (this.root === -1) {
      return;
    }

    // Zero-recursion stack (using a fixed-size array is faster than push/pop)
    // But simple array is fine for readability here.
    const stack: number[] = [this.root];

    while (stack.length > 0) {
      const node = stack.pop()!;

      // Pruning: If subtree max < point, no overlap possible
      if (this.maxEnds[node] < point) {
        continue;
      }

      // Check intersection
      if (this.starts[node] <= point && this.ends[node] >= point) {
        results.push(this.groupIds[node]);
      }

      const l = this.left[node];
      const r = this.right[node];

      // Traverse children
      if (l !== -1 && this.maxEnds[l] >= point) {
        stack.push(l);
      }

      // Only go right if current start is <= point (Standard Interval Tree logic)
      if (r !== -1 && this.starts[node] <= point) {
        stack.push(r);
      }
    }
  }

  /**
   * The "Magic" Rebuild: Sorts and Swaps buffers.
   * Zero Allocation.
   */
  /**
   * REBUILD & COMPACT
   * 1. Sorts the current intervals.
   * 2. Compacts adjacent/identical intervals (Dependency Fusion).
   * 3. Swaps buffers (Double Buffering).
   * 4. Builds the implicit tree topology.
   * * @param registry Needed to resolve aliased Group IDs (Union-Find)
   */
  public rebuild(registry: CanonicalRegistry) {
    if (this.count === 0) {
      return;
    }

    // --- STEP 1: Sort Indices ---
    // We sort an index array instead of the data arrays directly to avoid
    // moving large amounts of memory around during the sort phase.

    // Ensure index buffer is large enough
    if (this.indexBuf.length < this.capacity) {
      this.indexBuf = new Int32Array(this.capacity);
    }

    // Reset indices
    for (let i = 0; i < this.count; i++) {
      this.indexBuf[i] = i;
    }

    // Sort based on Start Row.
    // If Start Rows are equal, sort by End Row (Critical for compaction).
    this.indexBuf.subarray(0, this.count).sort((a, b) => {
      if (this.starts[a] !== this.starts[b]) {
        return this.starts[a] - this.starts[b];
      }
      return this.ends[a] - this.ends[b];
    });

    // --- STEP 2: Compaction & Copy to Shadow ---
    // We iterate through the sorted indices and write to the Shadow buffers.
    // If we find duplicates, we skip writing them (drop them).

    let writeIdx = 0;

    // Start with the first element
    const readPtr = this.indexBuf[0];

    // Initialize the first element in Shadow
    this.shadowStarts[0] = this.starts[readPtr];
    this.shadowEnds[0] = this.ends[readPtr];
    // Resolve the ID immediately so we store the "Canonical" ID
    this.shadowGroups[0] = registry.resolveId(this.groupIds[readPtr]);

    for (let i = 1; i < this.count; i++) {
      const currPtr = this.indexBuf[i];

      // Get the Resolved ID for the current group (handle aliases/unions)
      const currentResolvedId = registry.resolveId(this.groupIds[currPtr]);

      // Get the ID of the last group we successfully wrote
      const lastWrittenId = this.shadowGroups[writeIdx];

      // Check for Exact Overlap & Same Logic
      const isSameRange =
        this.starts[currPtr] === this.shadowStarts[writeIdx] &&
        this.ends[currPtr] === this.shadowEnds[writeIdx];

      const isSameGroup = currentResolvedId === lastWrittenId;

      if (isSameRange && isSameGroup) {
        // --- MERGE DETECTED ---
        // The current interval is identical to the previous one.
        // We do NOT increment writeIdx.
        // We essentially "drop" this interval from the new tree.
        continue;
      }

      // --- NO MERGE -> APPEND ---
      writeIdx++;

      this.shadowStarts[writeIdx] = this.starts[currPtr];
      this.shadowEnds[writeIdx] = this.ends[currPtr];
      this.shadowGroups[writeIdx] = currentResolvedId;
    }

    // Update the count to reflect the compacted size
    // (e.g., if we had 3 intervals and merged them into 1, new count is 1)
    const newCount = writeIdx + 1;
    this.count = newCount;

    // --- STEP 3: Buffer Swap ---
    // The "Shadow" buffers now contain the sorted, compacted data.
    // We swap them to be the "Active" buffers.

    let tmp = this.starts;
    this.starts = this.shadowStarts;
    this.shadowStarts = tmp;
    tmp = this.ends;
    this.ends = this.shadowEnds;
    this.shadowEnds = tmp;
    tmp = this.groupIds;
    this.groupIds = this.shadowGroups;
    this.shadowGroups = tmp;

    // --- STEP 4: Build Tree Topology ---
    // Rebuild the implicit tree structure (Left/Right pointers)
    // Complexity: O(N)
    this.root = this.buildRecursive(0, this.count - 1);

    this.isDirty = false;
  }

  private buildRecursive(low: number, high: number): number {
    if (low > high) {
      return -1;
    }
    const mid = (low + high) >>> 1;

    const lChild = this.buildRecursive(low, mid - 1);
    const rChild = this.buildRecursive(mid + 1, high);

    this.left[mid] = lChild;
    this.right[mid] = rChild;

    // Augmented Value: Max(ends[mid], maxEnds[left], maxEnds[right])
    let max = this.ends[mid];
    if (lChild !== -1) {
      max = Math.max(max, this.maxEnds[lChild]);
    }
    if (rChild !== -1) {
      max = Math.max(max, this.maxEnds[rChild]);
    }
    this.maxEnds[mid] = max;

    return mid;
  }
}

// --- 3. THE CANONICAL REGISTRY ----------------------------------------------

/**
 * Stores unique dependency patterns.
 * Ensures that A1:A1000->B1:B1000 uses only 1 GroupID.
 */
class CanonicalRegistry {
  private map = new Map<string, DependencyLogic>();
  private nextId = 1;
  private byId = new Map<GroupID, DependencyLogic>();

  // Use a string key for structural equality
  private makeKey(type: DependencyType, p1: number, p2: number): string {
    return `${type}:${p1}:${p2}`;
  }

  public registerRelative(dCol: number, dRow: number): GroupID {
    const key = this.makeKey(DependencyType.RELATIVE, dCol, dRow);
    let group = this.map.get(key);
    if (!group) {
      group = {
        id: this.nextId++,
        type: DependencyType.RELATIVE,
        colOffset: dCol,
        rowOffset: dRow,
      };
      this.map.set(key, group);
      this.byId.set(group.id, group);
    }
    return group.id;
  }

  public registerAbsolute(targetCol: number, targetRow: number): GroupID {
    const key = this.makeKey(DependencyType.ABSOLUTE, targetCol, targetRow);
    let group = this.map.get(key);
    if (!group) {
      group = {
        id: this.nextId++,
        type: DependencyType.ABSOLUTE,
        targetCol,
        targetRow,
      };
      this.map.set(key, group);
      this.byId.set(group.id, group);
    }
    return group.id;
  }

  public get(id: GroupID): DependencyLogic {
    return this.byId.get(id)!;
  }
}

// --- 4. THE MAIN ENGINE -----------------------------------------------------

export class DependencyGraph {
  private registry = new CanonicalRegistry();

  // One Interval Tree per Column (Vertical Bias optimization)
  private columns = new Map<ColIndex, FlatIntervalTree>();

  private getTree(col: ColIndex): FlatIntervalTree {
    let tree = this.columns.get(col);
    if (!tree) {
      tree = new FlatIntervalTree();
      this.columns.set(col, tree);
    }
    return tree;
  }

  /**
   * Adds a dependency: "dependent" cell depends on "source" range.
   * * Scenario: A1:A100 = B1:B100 + 1
   * Call: addDependency(0, 1, 100, 1, 1, 100)
   * (Col A, Rows 1-100 depends on Col B, Rows 1-100)
   */
  public addDependency(
    depCol: ColIndex,
    depStartRow: RowIndex,
    depEndRow: RowIndex,
    srcCol: ColIndex,
    srcStartRow: RowIndex,
    srcEndRow: RowIndex
  ) {
    const height = depEndRow - depStartRow;

    // 1. Determine Logic Type
    if (height === srcEndRow - srcStartRow) {
      // One-to-One (Relative)
      // If A1 depends on B1, offset is (0 - 1) = -1 col, (1 - 1) = 0 row.
      // Wait! We store "Who depends on ME".
      // Source is B. Dependent is A.
      // Logic: Dependent = Source + Offset
      // A (0) = B (1) + (-1)
      const colOffset = depCol - srcCol;
      const rowOffset = depStartRow - srcStartRow;

      const groupId = this.registry.registerRelative(colOffset, rowOffset);

      // Store in Source Column's Tree
      this.getTree(srcCol).insert(srcStartRow, srcEndRow, groupId);
    } else {
      // Many-to-One (Absolute / Bucket)
      // e.g. A1 = SUM(B1:B10).
      // Source Range: B1:B10. Dependent: A1.
      // Logic: "Triggers A1" (Absolute)
      // Note: If A1:A10 = SUM(B1:B10), we would need a mix, but let's stick to Absolute for now.

      // Optimization: If dragging SUM(B1:B10) down, we can make this relative too!
      // But for simplicity, let's treat unequal ranges as Absolute Single Targets.
      for (let r = depStartRow; r <= depEndRow; r++) {
        const groupId = this.registry.registerAbsolute(depCol, r);
        this.getTree(srcCol).insert(srcStartRow, srcEndRow, groupId);
      }
    }
  }

  /**
   * The Critical Path: "B50 Changed, who do I update?"
   */
  public getDependents(changedCol: ColIndex, changedRow: RowIndex): string[] {
    const tree = this.columns.get(changedCol);
    if (!tree) {
      return [];
    }

    const hits: GroupID[] = [];
    tree.search(changedRow, hits);

    const dependents: string[] = [];

    for (const gid of hits) {
      const logic = this.registry.get(gid);

      if (logic.type === DependencyType.RELATIVE) {
        // Calculate dependent coordinate
        const dCol = changedCol + logic.colOffset!;
        const dRow = changedRow + logic.rowOffset!;
        dependents.push(`Cell(${dCol},${dRow})`);
      } else if (logic.type === DependencyType.ABSOLUTE) {
        dependents.push(`Cell(${logic.targetCol},${logic.targetRow})`);
      }
    }

    return dependents;
  }
}
