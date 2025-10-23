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
      store.entityConfig = null;
      return;
    }

    setSelectedEntity(entityName);

    // Set entity configuration for the form
    const entityConfig = {
      type: entityName,
      name: entityName + '1',
      actions: {
        create: true,
        update: false
      },
      security: 'RBAC'
    };
    store.entityConfig = entityConfig;

    // Auto-add the fieldset for this entity to the canvas if it's empty
    if (store.formElements.length === 0) {
      store.formElements.push({
        '#tag': 'fieldset',
        'af-fieldset': entityConfig.name,
        class: 'af-container',
        id: `fieldset_${Date.now()}`,
        '#children': []
      });
    }

    loading = true;

    try {
      const fields = await getEntityFields(entityName);
      setEntityFields(fields);
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
