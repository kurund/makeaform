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
          .sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name))
      : [],
  );

  async function handleEntityChange(e: Event) {
    const entityName = (e.target as HTMLSelectElement).value;

    if (!entityName) {
      setSelectedEntity(null);
      setEntityFields({});
      return;
    }

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
    // af-fieldset references the entity instance name (e.g., "Individual1")
    store.formElements.push({
      "#tag": "fieldset",
      "af-fieldset": entityInstanceName,
      entityType: entityName, // Track the entity type for counting
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
      // Check if we already have fields from loadAdminData
      const existingFields = store.adminData?.fields?.[entityName];
      if (existingFields) {
        setEntityFields(existingFields);
      } else {
        // Fallback to fetching fields if not in adminData
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
  <div class="form-group">
    <label for="entity-select">
      <i class="fa fa-database"></i> Select Entity
    </label>
    <select
      id="entity-select"
      class="form-control"
      value={store.selectedEntity || ""}
      onchange={handleEntityChange}
      disabled={loading}
    >
      <option value="">-- Choose an entity --</option>
      {#each entities as entity}
        <option value={entity.name}>
          {entity.title || entity.name}
        </option>
      {/each}
    </select>
    {#if loading}
      <small class="help-block">
        <i class="fa fa-spinner fa-spin"></i> Loading fields...
      </small>
    {:else if store.selectedEntity}
      <small class="help-block">
        {Object.keys(store.entityFields).length} fields available
      </small>
    {/if}
  </div>
</div>

<style>
  .entity-selector {
    padding: var(--crm-l-reg) var(--crm-l-reg-2);
    background: var(--crm-paper);
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .form-group {
    margin: 0;
  }

  .form-group label {
    display: block;
    margin-bottom: var(--crm-l-medium);
    font-weight: 700;
    font-size: var(--crm-font-small-size);
    color: var(--crm-c-gray-600);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .form-group label i {
    color: var(--makeaform-accent);
    margin-right: var(--crm-l-small);
  }

  .form-group select {
    border: 1px solid var(--crm-input-border-color);
    border-radius: var(--makeaform-radius);
    padding: var(--crm-l-medium) var(--crm-l-medium-2);
    transition: all 0.2s ease;
    background: var(--crm-input-bg-color);
    color: var(--crm-input-color);
  }

  .form-group select:focus {
    border-color: var(--makeaform-accent);
    outline: none;
    box-shadow: 0 0 0 3px var(--makeaform-accent-bg);
  }

  .help-block {
    display: block;
    margin-top: var(--crm-l-medium);
    color: var(--crm-c-gray-600);
    font-size: var(--crm-font-small-size);
    font-weight: 500;
  }

  .help-block i {
    color: var(--makeaform-accent);
  }
</style>
