<script lang="ts">
  import { store, setSelectedEntity, setEntityFields } from '../stores/formStore.svelte';
  import { getEntityFields } from '../api/civicrm';

  let loading = $state(false);

  const entities = $derived(
    store.adminData?.entities
      ? Object.entries(store.adminData.entities)
          .map(([name, entity]) => ({ name, ...entity }))
          .sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name))
      : []
  );

  async function handleEntityChange(e: Event) {
    const entityName = (e.target as HTMLSelectElement).value;

    if (!entityName) {
      setSelectedEntity(null);
      setEntityFields({});
      return;
    }

    setSelectedEntity(entityName);

    // Generate a unique entity name (e.g., Contact1, Contact2, etc.)
    const existingCount = store.formElements.filter(
      el => el['#tag'] === 'fieldset' && el['af-fieldset']?.startsWith(entityName)
    ).length;
    const entityInstanceName = `${entityName}${existingCount + 1}`;

    // Add entity configuration if it's the first entity
    if (!store.entityConfig) {
      store.entityConfig = {
        type: entityName,
        name: entityInstanceName,
        actions: {
          create: true,
          update: false
        },
        security: 'RBAC'
      };
    }

    // Always add a new fieldset for this entity
    store.formElements.push({
      '#tag': 'fieldset',
      'af-fieldset': entityInstanceName,
      class: 'af-container',
      id: `fieldset_${Date.now()}`,
      '#children': []
    });

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
      console.error('Failed to load entity fields:', error);
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
      value={store.selectedEntity || ''}
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
    padding: 15px;
    background: #fff;
    border-bottom: 1px solid #ddd;
  }

  .form-group {
    margin: 0;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    font-size: 13px;
    color: #333;
  }

  .form-group label i {
    color: #337ab7;
    margin-right: 5px;
  }

  .help-block {
    display: block;
    margin-top: 5px;
    color: #737373;
    font-size: 12px;
  }
</style>
