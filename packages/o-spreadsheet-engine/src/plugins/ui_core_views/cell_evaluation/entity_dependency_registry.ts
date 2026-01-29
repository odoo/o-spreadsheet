import { numberToLetters } from "../../../helpers/coordinates";
import { Getters } from "../../../types/getters";
import { UID } from "../../../types/misc";
import { BoundedRange } from "../../../types/range";
import { RTreeItem, SpreadsheetRTree } from "./r_tree";

export type DependentEntityType = "chart" | "pivot" | "conditionalFormat";

/**
 * The kind of dependency an entity has on a cell range.
 * - "value": the entity depends on the cell values (default)
 * - "style": the entity depends on the computed style of the cells
 */
export type DependencyKind = "value" | "style";

export interface EntityDependency {
  range: BoundedRange;
  kind: DependencyKind;
}

export interface DependentEntity {
  id: UID;
  type: DependentEntityType;
  /** @deprecated Use `rangeDependencies` instead */
  dependencies?: BoundedRange[];
  /** Dependencies with their kind (value or style) */
  rangeDependencies?: EntityDependency[];
}

/**
 * Callback called when an entity needs to be invalidated
 */
export type InvalidationCallback = (entityId: UID, entityType: DependentEntityType) => void;

interface EntityRTreeData {
  entityId: UID;
  entityType: DependentEntityType;
}

interface StoredEntityDependencies {
  valueItems: RTreeItem<EntityRTreeData>[];
  styleItems: RTreeItem<EntityRTreeData>[];
  entityType: DependentEntityType;
}

/**
 * Centralized registry to track dependencies of non-formula entities
 * (charts, pivots, conditional formats, etc.)
 */
export class EntityDependencyRegistry {
  /** R-Tree for value dependencies (cell values) */
  private readonly valueRTree: SpreadsheetRTree<EntityRTreeData> = new SpreadsheetRTree();
  /** R-Tree for style dependencies (computed cell styles) */
  private readonly styleRTree: SpreadsheetRTree<EntityRTreeData> = new SpreadsheetRTree();
  private readonly entitiesDependencies: Map<UID, StoredEntityDependencies> = new Map();
  private readonly invalidationCallbacks: Map<DependentEntityType, InvalidationCallback> =
    new Map();

  /**
   * Register an invalidation callback for an entity type.
   * This callback will be called when an entity of this type needs to be recomputed.
   */
  registerInvalidationCallback(
    entityType: DependentEntityType,
    callback: InvalidationCallback
  ): void {
    this.invalidationCallbacks.set(entityType, callback);
  }

  /**
   * Register an entity with its dependencies.
   * The entity will be notified when a cell in its dependencies changes.
   */
  registerEntity(entity: DependentEntity): void {
    // Remove old dependencies if the entity already exists
    this.unregisterEntity(entity.id);

    const valueItems: RTreeItem<EntityRTreeData>[] = [];
    const styleItems: RTreeItem<EntityRTreeData>[] = [];

    // Handle new format with rangeDependencies
    if (entity.rangeDependencies) {
      for (const dep of entity.rangeDependencies) {
        const item: RTreeItem<EntityRTreeData> = {
          boundingBox: {
            sheetId: dep.range.sheetId,
            zone: dep.range.zone,
          },
          data: {
            entityId: entity.id,
            entityType: entity.type,
          },
        };
        if (dep.kind === "style") {
          this.styleRTree.insert(item);
          styleItems.push(item);
        } else {
          this.valueRTree.insert(item);
          valueItems.push(item);
        }
      }
    }
    // Handle legacy format with dependencies (all treated as value dependencies)
    else if (entity.dependencies) {
      for (const dep of entity.dependencies) {
        const item: RTreeItem<EntityRTreeData> = {
          boundingBox: {
            sheetId: dep.sheetId,
            zone: dep.zone,
          },
          data: {
            entityId: entity.id,
            entityType: entity.type,
          },
        };
        this.valueRTree.insert(item);
        valueItems.push(item);
      }
    }

    this.entitiesDependencies.set(entity.id, {
      valueItems,
      styleItems,
      entityType: entity.type,
    });
  }

  unregisterAllEntitiesOfType(type: DependentEntityType): void {
    for (const [entityId, stored] of this.entitiesDependencies) {
      if (stored.entityType === type) {
        this.unregisterEntity(entityId);
      }
    }
  }

  /**
   * Remove an entity from the registry
   */
  unregisterEntity(entityId: UID): void {
    const stored = this.entitiesDependencies.get(entityId);
    if (!stored) {
      return;
    }

    for (const item of stored.valueItems) {
      this.valueRTree.remove(item);
    }
    for (const item of stored.styleItems) {
      this.styleRTree.remove(item);
    }

    this.entitiesDependencies.delete(entityId);
  }

  updateEntityDependencies(entityId: UID, newDependencies: BoundedRange[]): void {
    const stored = this.entitiesDependencies.get(entityId);
    if (!stored) {
      return;
    }

    this.registerEntity({
      id: entityId,
      type: stored.entityType,
      dependencies: newDependencies,
    });
  }

  /**
   * Find all entities that depend on the given ranges (value dependencies)
   * and notify them via their invalidation callbacks.
   */
  invalidateEntitiesDependingOn(changedRanges: Iterable<BoundedRange>) {
    this.invalidateEntitiesInRTree(this.valueRTree, changedRanges);
  }

  /**
   * Find all entities that depend on the style of the given ranges
   * and notify them via their invalidation callbacks.
   * This should be called when the computed style of cells changes (e.g., after CF evaluation).
   */
  invalidateStyleDependencies(changedRanges: Iterable<BoundedRange>) {
    this.invalidateEntitiesInRTree(this.styleRTree, changedRanges);
  }

  private invalidateEntitiesInRTree(
    rTree: SpreadsheetRTree<EntityRTreeData>,
    changedRanges: Iterable<BoundedRange>
  ) {
    const invalidatedEntities = new Set<UID>();

    for (const range of changedRanges) {
      const matchingItems = rTree.search({
        sheetId: range.sheetId,
        zone: range.zone,
      });

      for (const item of matchingItems) {
        const { entityId, entityType } = item.data;

        // Avoid notifying the same entity multiple times
        if (invalidatedEntities.has(entityId)) {
          continue;
        }
        invalidatedEntities.add(entityId);

        // Call the invalidation callback
        this.invalidationCallbacks.get(entityType)?.(entityId, entityType);
      }
    }
  }

  invalidateAllEntities(): void {
    for (const [entityId, stored] of this.entitiesDependencies) {
      this.invalidationCallbacks.get(stored.entityType)?.(entityId, stored.entityType);
    }
  }

  getEntitiesOfType(entityType: DependentEntityType): UID[] {
    const result: UID[] = [];
    for (const [entityId, stored] of this.entitiesDependencies) {
      if (stored.entityType === entityType) {
        result.push(entityId);
      }
    }
    return result;
  }

  hasEntity(entityId: UID): boolean {
    return this.entitiesDependencies.has(entityId);
  }

  getEntityDependencies(entityId: UID): BoundedRange[] {
    const stored = this.entitiesDependencies.get(entityId);
    if (!stored) {
      return [];
    }

    const allItems = [...stored.valueItems, ...stored.styleItems];
    return allItems.map((item) => ({
      sheetId: item.boundingBox.sheetId,
      zone: item.boundingBox.zone,
    }));
  }

  clear(): void {
    this.entitiesDependencies.clear();
  }

  print(getters: Getters): void {
    console.log("=== Entity Dependency Graph ===");
    for (const [entityId, stored] of this.entitiesDependencies) {
      const printItems = (items: RTreeItem<EntityRTreeData>[], kind: string) => {
        for (const item of items) {
          const { sheetId, zone } = item.boundingBox;
          const sheetName = getters.getSheetName(sheetId);
          const rangeStr = `${sheetName}!${numberToLetters(zone.left)}${
            zone.top + 1
          }:${numberToLetters(zone.right)}${zone.bottom + 1}`;
          console.log(`[${rangeStr}] => (${stored.entityType}, ${entityId}, ${kind})`);
        }
      };
      printItems(stored.valueItems, "value");
      printItems(stored.styleItems, "style");
    }
    console.log("=== End ===");
  }
}
