<script lang="ts">
  import { onMount } from 'svelte';
  import Toolbar from './lib/components/Toolbar.svelte';
  import Palette from './lib/components/Palette.svelte';
  import Canvas from './lib/components/Canvas.svelte';
  import PropertiesPanel from './lib/components/PropertiesPanel.svelte';
  import { store, setAdminData, setHasUnsavedChanges } from './lib/stores/formStore.svelte';
  import { loadAdminData, saveForm } from './lib/api/civicrm';

  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const data = await loadAdminData();
      setAdminData(data);

      // Check if we're in edit mode (form name provided)
      const formName = (window as any).CRM?.vars?.makeaform?.formName;
      if (formName) {
        console.log('Loading form for editing:', formName);
        await loadExistingForm(formName);
      }

      loading = false;
    } catch (err) {
      console.error('Failed to load admin data:', err);
      error = 'Failed to load form builder. Please refresh the page.';
      loading = false;
    }
  });

  async function loadExistingForm(formName: string) {
    try {
      const formData = await window.CRM.api4('Afform', 'get', {
        where: [['name', '=', formName]],
        layoutFormat: 'shallow'
      });

      if (formData && formData.length > 0) {
        const form = formData[0];
        console.log('Loaded form:', form);

        // Extract the form layout
        const layout = form.layout || [];

        // Find the af-form wrapper
        const afForm = layout.find((el: any) => el['#tag'] === 'af-form');
        if (afForm && afForm['#children']) {
          const children = afForm['#children'];

          // Separate af-entity from form elements
          const afEntity = children.find((el: any) => el['#tag'] === 'af-entity');
          const formElements = children.filter((el: any) => el['#tag'] !== 'af-entity');

          // Set entity config if present
          if (afEntity) {
            store.entityConfig = {
              type: afEntity.type,
              name: afEntity.name,
              actions: afEntity.actions || {},
              security: afEntity.security || 'RBAC'
            };
            store.selectedEntity = afEntity.type;

            // Load entity fields
            const fields = await window.CRM.api4(afEntity.type, 'getFields', {
              loadOptions: ['id', 'label'],
              where: [['type', '!=', 'Extra']]
            });
            const fieldsMap: Record<string, any> = {};
            fields.forEach((field: any) => {
              fieldsMap[field.name] = field;
            });
            store.entityFields = fieldsMap;
          }

          // Load form elements
          store.formElements = formElements;
        }

        // Set metadata
        store.formMetadata = {
          name: form.name,
          title: form.title || '',
          description: form.description || '',
          type: form.type || 'form',
          server_route: form.server_route || ''
        };

        store.hasUnsavedChanges = false;
      }
    } catch (err) {
      console.error('Failed to load form:', err);
      alert('Failed to load form: ' + (err as any).message);
    }
  }

  async function handleSave() {
    try {
      // Build the proper Afform structure
      const formChildren: any[] = [];

      // Add af-entity if entity is configured
      if (store.entityConfig) {
        formChildren.push({
          '#tag': 'af-entity',
          type: store.entityConfig.type,
          name: store.entityConfig.name,
          actions: store.entityConfig.actions,
          security: store.entityConfig.security || 'RBAC'
        });
      }

      // Add form elements (fieldsets, fields, buttons, etc.)
      formChildren.push(...store.formElements);

      // Wrap everything in af-form
      const layout = [{
        '#tag': 'af-form',
        ctrl: 'afform',
        '#children': formChildren
      }];

      await saveForm({
        name: store.formMetadata.name,
        title: store.formMetadata.title,
        description: store.formMetadata.description,
        server_route: store.formMetadata.server_route,
        layout: layout
      });
      setHasUnsavedChanges(false);
      window.CRM.alert('Form saved successfully!', 'Success', 'success');
    } catch (err: any) {
      console.error('Save failed:', err);
      const errorMsg = err?.error_message || err?.message || 'Unknown error occurred';
      alert('Save failed: ' + errorMsg);
    }
  }
</script>

<div class="form-builder-app">
  {#if loading}
    <div class="loading-screen">
      <i class="fa fa-spinner fa-spin fa-3x"></i>
      <p>Loading Form Builder...</p>
    </div>
  {:else if error}
    <div class="error-screen">
      <i class="fa fa-exclamation-triangle fa-3x"></i>
      <p>{error}</p>
    </div>
  {:else}
    <Toolbar onSave={handleSave} />

    <div class="form-builder-content">
      <div class="panel-left">
        <Palette />
      </div>

      <div class="panel-center">
        <Canvas />
      </div>

      <div class="panel-right">
        <PropertiesPanel />
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }

  .form-builder-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .loading-screen,
  .error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: #666;
  }

  .loading-screen i,
  .error-screen i {
    margin-bottom: 20px;
  }

  .loading-screen p,
  .error-screen p {
    font-size: 16px;
    margin: 0;
  }

  .error-screen {
    color: #d9534f;
  }

  .form-builder-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .panel-left {
    width: 280px;
    flex-shrink: 0;
  }

  .panel-center {
    flex: 1;
    min-width: 0;
  }

  .panel-right {
    width: 320px;
    flex-shrink: 0;
  }

  @media (max-width: 1200px) {
    .panel-left {
      width: 250px;
    }

    .panel-right {
      width: 280px;
    }
  }
</style>
