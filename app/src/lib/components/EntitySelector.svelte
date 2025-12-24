<script lang="ts">
  import {
    store,
    setSelectedEntity,
    setEntityFields,
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

    // Generate a unique entity instance name (e.g., Individual1, Individual2, etc.)
    const existingCount = store.formElements.filter(
      (el) => el["#tag"] === "fieldset" && el["af-fieldset"] === entityName,
    ).length;
    const entityInstanceName = `${entityName}${existingCount + 1}`;

    // Add entity configuration if it's the first entity
    if (!store.entityConfig) {
      store.entityConfig = {
        type: entityName,
        name: entityInstanceName,
        label: `${entityName} ${existingCount + 1}`,
        data: {
          source: "",
        },
        actions: {
          create: true,
          update: false,
        },
        security: "RBAC",
      };
    }

    // Always add a new fieldset for this entity
    // af-fieldset should be just the entity name (e.g., "Individual")
    store.formElements.push({
      "#tag": "fieldset",
      "af-fieldset": entityName,
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
      (el) => el["#tag"] === "button"
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
    padding: var(--crm-r) var(--crm-r2);
    background: var(--crm-c-layer0-bg);
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .form-group {
    margin: 0;
  }

  .form-group label {
    display: block;
    margin-bottom: var(--crm-m);
    font-weight: 700;
    font-size: var(--crm-small-font-size);
    color: var(--crm-c-gray-600);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .form-group label i {
    color: var(--makeaform-accent);
    margin-right: var(--crm-s);
  }

  .form-group select {
    border: 1px solid var(--crm-input-border-color);
    border-radius: var(--makeaform-radius);
    padding: var(--crm-m) var(--crm-m2);
    transition: all 0.2s ease;
    background: var(--crm-input-bg);
    color: var(--crm-input-color);
  }

  .form-group select:focus {
    border-color: var(--makeaform-accent);
    outline: none;
    box-shadow: 0 0 0 3px var(--makeaform-accent-bg);
  }

  .help-block {
    display: block;
    margin-top: var(--crm-m);
    color: var(--crm-c-gray-600);
    font-size: var(--crm-small-font-size);
    font-weight: 500;
  }

  .help-block i {
    color: var(--makeaform-accent);
  }
</style>
