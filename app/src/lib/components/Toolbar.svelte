<script lang="ts">
  import { store, setIsSaving } from '../stores/formStore.svelte';
  import { saveForm } from '../api/civicrm';

  let { onSave = () => {} } = $props();

  let autoGeneratePath = $state(true);

  // Auto-generate path from title on first input
  function handleTitleChange(e: Event) {
    if (autoGeneratePath && !store.formMetadata.server_route) {
      const title = (e.target as HTMLInputElement).value;
      const path = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      store.formMetadata.server_route = 'civicrm/' + path;
    }
  }

  // Update machine name when server_route changes
  $effect(() => {
    if (store.formMetadata.server_route) {
      // Extract the path portion after 'civicrm/' and generate machine name
      const path = store.formMetadata.server_route.replace(/^civicrm\//, '');
      store.formMetadata.name = 'afform_' + path.replace(/-/g, '_');
      autoGeneratePath = false;
    }
  });

  async function handleSave() {
    if (store.isSaving) return;

    // Validate required fields
    if (!store.formMetadata.title) {
      alert('Please enter a form title');
      return;
    }
    if (!store.formMetadata.server_route) {
      alert('Please enter a form path');
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyboardShortcut(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }
</script>

<svelte:window onkeydown={handleKeyboardShortcut} />

<div class="form-builder-toolbar">
  <div class="toolbar-left">
    <div class="form-name-group">
      <div class="form-group">
        <label for="form-title">Form Title</label>
        <input
          id="form-title"
          type="text"
          bind:value={store.formMetadata.title}
          class="form-control"
          placeholder="My Form"
          aria-label="Form title"
          oninput={handleTitleChange}
        />
      </div>
      <div class="form-group">
        <label for="form-path">Form Path</label>
        <input
          id="form-path"
          type="text"
          bind:value={store.formMetadata.server_route}
          class="form-control"
          placeholder="civicrm/my-form"
          aria-label="Form path"
          title="Use full path starting with civicrm/"
        />
      </div>
    </div>
  </div>

  <div class="toolbar-right">
    {#if store.hasUnsavedChanges}
      <span class="label label-warning">Unsaved Changes</span>
    {:else}
      <span class="label label-success">Saved</span>
    {/if}

    <button
      type="button"
      class="btn btn-primary"
      onclick={handleSave}
      disabled={store.isSaving}
    >
      {#if store.isSaving}
        <i class="fa fa-spinner fa-spin"></i> Saving...
      {:else}
        <i class="fa fa-save"></i> Save
      {/if}
    </button>
  </div>
</div>

<style>
  .form-builder-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 20px;
    background: #fff;
    border-bottom: 1px solid #ddd;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .toolbar-left {
    flex: 1;
  }

  .form-name-group {
    display: flex;
    gap: 15px;
    align-items: flex-end;
  }

  .form-group {
    margin: 0;
  }

  .form-group label {
    display: block;
    font-size: 11px;
    font-weight: bold;
    color: #666;
    margin-bottom: 3px;
    text-transform: uppercase;
  }

  .form-group input {
    border: 1px solid #ddd;
    padding: 6px 10px;
    font-size: 14px;
    min-width: 200px;
  }

  .form-group input:hover,
  .form-group input:focus {
    border-color: #337ab7;
    background: #fff;
  }

  #form-title {
    font-weight: bold;
    min-width: 300px;
  }

  #form-path {
    min-width: 200px;
  }

  .input-group {
    display: flex;
  }

  .input-group-addon {
    padding: 6px 10px;
    font-size: 14px;
    background: #eee;
    border: 1px solid #ddd;
    border-right: none;
    border-radius: 4px 0 0 4px;
    color: #666;
  }

  .input-group .form-control {
    border-radius: 0 4px 4px 0;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toolbar-right .label {
    font-size: 12px;
    padding: 4px 8px;
  }
</style>
