<script lang="ts">
  import {
    store,
    setSelectedEntity,
    setEntityFields,
    gotoField,
  } from "../stores/formStore.svelte";
  import { getEntityFields } from "../api/civicrm";

  let loading = $state(false);

  const entities = $derived(
    store.adminData?.entities
      ? Object.entries(store.adminData.entities)
          .map(([name, entity]) => ({ name, ...entity }))
          .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100))
      : [],
  );

  // Group entities by their group field
  const groupedEntities = $derived(() => {
    const groups: Record<string, typeof entities> = {};
    for (const entity of entities) {
      const group = entity.group || "Other";
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(entity);
    }
    // Return ordered: Contact Types first, then Components, then Other
    const orderedGroups: Array<{ name: string; entities: typeof entities }> = [];
    for (const groupName of ["Contact Types", "Components", "Other"]) {
      if (groups[groupName]) {
        orderedGroups.push({ name: groupName, entities: groups[groupName] });
      }
    }
    return orderedGroups;
  });

  async function handleEntitySelect(entityName: string) {
    if (loading) return;

    setSelectedEntity(entityName);

    // Count existing fieldsets for this entity type to generate unique instance name
    const existingCount = store.formElements.filter(
      (el) => el["#tag"] === "fieldset" && el.entityType === entityName,
    ).length;
    const entityInstanceName = `${entityName}${existingCount + 1}`;

    // Add entity configuration for this entity instance
    store.entityConfigs.push({
      type: entityName,
      name: entityInstanceName,
      label: `${entityName} ${existingCount + 1}`,
      data: {
        source: "",
      },
      actions: {
        create: true,
        update: true,
      },
      security: "RBAC",
    });

    // Add a new fieldset for this entity
    store.formElements.push({
      "#tag": "fieldset",
      "af-fieldset": entityInstanceName,
      entityType: entityName,
      label: `${entityName} ${existingCount + 1}`,
      class: "af-container",
      id: `fieldset_${Date.now()}`,
      "#children": [],
      actions: {
        update: true,
        delete: true,
      },
    });

    // Add submit button if it doesn't exist yet
    const hasSubmitButton = store.formElements.some(
      (el) => el["#tag"] === "button",
    );
    if (!hasSubmitButton) {
      store.formElements.push({
        "#tag": "button",
        class: "af-button btn btn-primary",
        "crm-icon": "fa-check",
        "#children": ["Submit"],
        id: `button_${Date.now()}`,
      });
    }

    // Navigate to the newly created entity
    const newPageIndex = store.pages.length - 1;
    gotoField(newPageIndex, 0);

    loading = true;

    try {
      const existingFields = store.adminData?.fields?.[entityName];
      if (existingFields) {
        setEntityFields(existingFields);
      } else {
        const fields = await getEntityFields(entityName);
        setEntityFields(fields);
      }
    } catch (error) {
      console.error("Failed to load entity fields:", error);
      alert(`Failed to load fields for ${entityName}`);
    } finally {
      loading = false;
    }
  }
</script>

<div class="entity-selector">
  {#each groupedEntities() as group}
    <div class="entity-group">
      <div class="group-header">{group.name}</div>
      <div class="entity-list">
        {#each group.entities as entity}
          <button
            type="button"
            class="entity-item"
            disabled={loading}
            onclick={() => handleEntitySelect(entity.name)}
          >
            <i class="crm-i {entity.icon || 'fa-puzzle-piece'} entity-icon"></i>
            <span>{entity.title || entity.name}</span>
          </button>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .entity-selector {
    background: var(--crm-paper);
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .entity-group {
    border-bottom: 1px solid var(--crm-c-gray-100);
  }

  .entity-group:last-child {
    border-bottom: none;
  }

  .group-header {
    padding: var(--crm-l-small) var(--crm-l-reg);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--crm-c-gray-500);
    background: var(--crm-layer1-bg-color);
  }

  .entity-list {
    display: flex;
    flex-direction: column;
  }

  .entity-item {
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-medium-1) var(--crm-l-reg);
    background: var(--crm-paper);
    border: none;
    border-bottom: 1px solid var(--crm-c-gray-100);
    cursor: pointer;
    font-size: var(--crm-font-small-size);
    color: var(--crm-text-color);
    transition: all 0.15s ease;
    text-align: left;
    width: 100%;
  }

  .entity-item:last-child {
    border-bottom: none;
  }

  .entity-item:hover:not(:disabled) {
    background: var(--makeaform-accent-bg);
    color: var(--makeaform-accent);
  }

  .entity-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .entity-icon {
    font-size: var(--crm-font-small-size);
    color: var(--makeaform-accent);
    width: 16px;
    text-align: center;
  }

  .entity-item span {
    font-weight: 500;
  }
</style>
