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
    padding: var(--crm-r) var(--crm-r4);
    background: var(--crm-c-layer0-bg);
    border-bottom: 1px solid var(--crm-c-gray-200);
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .toolbar-left {
    flex: 1;
  }

  .form-name-group {
    display: flex;
    gap: var(--crm-r2);
    align-items: flex-end;
  }

  .form-group {
    margin: 0;
  }

  .form-group label {
    display: block;
    font-size: var(--crm-small-font-size);
    font-weight: 600;
    color: var(--crm-c-gray-600);
    margin-bottom: var(--crm-s);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .form-group input {
    border: 1px solid var(--crm-input-border-color);
    border-radius: var(--crm-roundness);
    padding: var(--crm-m) var(--crm-m2);
    font-size: var(--crm-m3);
    min-width: 200px;
    transition: all 0.2s ease;
    background: var(--crm-input-bg);
    color: var(--crm-input-color);
  }

  .form-group input:hover {
    border-color: var(--makeaform-accent);
  }

  .form-group input:focus {
    border-color: var(--makeaform-accent);
    outline: none;
    box-shadow: 0 0 0 3px var(--makeaform-accent-bg);
  }

  #form-title {
    font-weight: 600;
    min-width: 300px;
    font-size: var(--crm-font-size);
  }

  #form-path {
    min-width: 200px;
  }

  .input-group {
    display: flex;
  }

  .input-group-addon {
    padding: var(--crm-s) var(--crm-m1);
    font-size: var(--crm-m3);
    background: var(--crm-c-gray-100);
    border: 1px solid var(--crm-c-gray-300);
    border-right: none;
    border-radius: var(--crm-roundness) 0 0 var(--crm-roundness);
    color: var(--crm-c-gray-700);
  }

  .input-group .form-control {
    border-radius: 0 var(--crm-roundness) var(--crm-roundness) 0;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: var(--crm-m2);
  }

  .toolbar-right .label {
    font-size: var(--crm-small-font-size);
    padding: var(--crm-s) var(--crm-m2);
    border-radius: var(--crm-m2);
    font-weight: 600;
  }

  .toolbar-right .label-warning {
    background: var(--crm-c-warning-light);
    color: var(--crm-c-warning);
  }

  .toolbar-right .label-success {
    background: var(--crm-c-success-light);
    color: var(--crm-c-success);
  }

  .toolbar-right .btn-primary {
    background: var(--crm-c-primary);
    border-color: var(--crm-c-primary);
    color: var(--crm-c-primary-text);
    padding: var(--crm-btn-padding-block) var(--crm-btn-padding-inline);
    border-radius: var(--makeaform-radius);
    font-weight: 600;
    font-size: var(--crm-m3);
    transition: all 0.2s ease;
  }

  .toolbar-right .btn-primary:hover {
    background: var(--crm-c-primary-hover);
    border-color: var(--crm-c-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(from var(--crm-c-primary) r g b / 0.3);
  }

  .toolbar-right .btn-primary:disabled {
    background: var(--crm-c-gray-400);
    border-color: var(--crm-c-gray-400);
    transform: none;
    box-shadow: none;
  }
</style>
