import { UID } from "../../../types/misc";
import { BoundedRange } from "../../../types/range";
import { RTreeItem, SpreadsheetRTree } from "./r_tree";

export type DependentEntityType = "chart" | "pivot" | "conditionalFormat";

export interface DependentEntity {
  id: UID;
  type: DependentEntityType;
  dependencies: BoundedRange[];
}

/**
 * Callback called when an entity needs to be invalidated
 */
export type InvalidationCallback = (entityId: UID, entityType: DependentEntityType) => void;

interface EntityRTreeData {
  entityId: UID;
  entityType: DependentEntityType;
}

/**
 * Centralized registry to track dependencies of non-formula entities
 * (charts, pivots, conditional formats, etc.)
 */
export class EntityDependencyRegistry {
  private readonly rTree: SpreadsheetRTree<EntityRTreeData> = new SpreadsheetRTree();
  private readonly entitiesDependencies: Map<UID, RTreeItem<EntityRTreeData>[]> = new Map();
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

    const items: RTreeItem<EntityRTreeData>[] = [];

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
      this.rTree.insert(item);
      items.push(item);
    }

    this.entitiesDependencies.set(entity.id, items);
  }

  /**
   * Remove an entity from the registry
   */
  unregisterEntity(entityId: UID): void {
    const items = this.entitiesDependencies.get(entityId);
    if (!items) {
      return;
    }

    for (const item of items) {
      this.rTree.remove(item);
    }

    this.entitiesDependencies.delete(entityId);
  }

  updateEntityDependencies(entityId: UID, newDependencies: BoundedRange[]): void {
    const items = this.entitiesDependencies.get(entityId);
    if (!items || items.length === 0) {
      return;
    }

    const entityType = items[0].data.entityType;

    this.registerEntity({
      id: entityId,
      type: entityType,
      dependencies: newDependencies,
    });
  }

  /**
   * Find all entities that depend on the given ranges
   * and notify them via their invalidation callbacks.
   */
  invalidateEntitiesDependingOn(changedRanges: Iterable<BoundedRange>) {
    const invalidatedEntities = new Set<UID>();

    for (const range of changedRanges) {
      const matchingItems = this.rTree.search({
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
    for (const [entityId, items] of this.entitiesDependencies) {
      if (items.length > 0) {
        const entityType = items[0].data.entityType;
        this.invalidationCallbacks.get(entityType)?.(entityId, entityType);
      }
    }
  }

  getEntitiesOfType(entityType: DependentEntityType): UID[] {
    const result: UID[] = [];
    for (const [entityId, items] of this.entitiesDependencies) {
      if (items.length > 0 && items[0].data.entityType === entityType) {
        result.push(entityId);
      }
    }
    return result;
  }

  hasEntity(entityId: UID): boolean {
    return this.entitiesDependencies.has(entityId);
  }

  getEntityDependencies(entityId: UID): BoundedRange[] {
    const items = this.entitiesDependencies.get(entityId);
    if (!items) {
      return [];
    }

    return items.map((item) => ({
      sheetId: item.boundingBox.sheetId,
      zone: item.boundingBox.zone,
    }));
  }

  clear(): void {
    this.entitiesDependencies.clear();
  }
}
