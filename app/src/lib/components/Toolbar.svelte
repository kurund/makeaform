<script lang="ts">
  import { store, setIsSaving, setHasUnsavedChanges } from "../stores/formStore.svelte";
  import { saveForm, deleteForm } from "../api/civicrm";

  let { onSave = () => {}, onDelete = () => {} } = $props();

  let autoGeneratePath = $state(true);
  let showSettings = $state(false);
  let isDeleting = $state(false);

  // Check if this is an existing form (editing mode)
  const isExistingForm = $derived(
    store.formMetadata.name &&
      store.formMetadata.name !== "new_form" &&
      store.formMetadata.name.startsWith("afform_"),
  );

  // Auto-generate path from title on first input
  function handleTitleChange(e: Event) {
    if (autoGeneratePath && !store.formMetadata.server_route) {
      const title = (e.target as HTMLInputElement).value;
      const path = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      store.formMetadata.server_route = "civicrm/" + path;
    }
  }

  // Update machine name when server_route changes
  $effect(() => {
    if (store.formMetadata.server_route) {
      // Extract the path portion after 'civicrm/' and generate machine name in camelCase
      const path = store.formMetadata.server_route.replace(/^civicrm\//, "");
      // Convert path to camelCase: my-form -> MyForm, form4 -> Form4
      const camelCase = path
        .split(/[-_]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
      store.formMetadata.name = "afform" + camelCase;
      autoGeneratePath = false;
    }
  });

  async function handleSave() {
    if (store.isSaving) return;

    // Validate required fields
    if (!store.formMetadata.title) {
      alert("Please enter a form title");
      return;
    }
    if (!store.formMetadata.server_route) {
      alert("Please enter a form path");
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  }

  function handlePreview() {
    if (!isExistingForm || store.hasUnsavedChanges) {
      alert("Please save the form first before previewing.");
      return;
    }
    // Open the form in a new tab
    const previewUrl = window.CRM.url(store.formMetadata.server_route);
    window.open(previewUrl, "_blank");
  }

  async function handleDelete() {
    if (!isExistingForm) return;

    const confirmed = confirm(
      `Are you sure you want to delete the form "${store.formMetadata.title}"?\n\nThis action cannot be undone.`,
    );
    if (!confirmed) return;

    isDeleting = true;
    try {
      await deleteForm(store.formMetadata.name);
      window.CRM.alert("Form deleted successfully!", "Success", "success");
      // Redirect to afform list
      window.location.href = window.CRM.url("civicrm/admin/afform");
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert("Failed to delete form: " + (err?.message || "Unknown error"));
    } finally {
      isDeleting = false;
    }
  }

  function handleKeyboardShortcut(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  }

  function toggleSettings() {
    showSettings = !showSettings;
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
      <button
        type="button"
        class="btn btn-settings"
        onclick={toggleSettings}
        title="Form Settings"
      >
        <i class="fa fa-cog"></i>
      </button>
    </div>
  </div>

  <div class="toolbar-right">
    {#if store.hasUnsavedChanges}
      <span class="label label-warning">Unsaved Changes</span>
    {:else}
      <span class="label label-success">Saved</span>
    {/if}

    {#if isExistingForm}
      <button
        type="button"
        class="btn btn-secondary"
        onclick={handlePreview}
        disabled={store.hasUnsavedChanges}
        title={store.hasUnsavedChanges ? "Save first to preview" : "Preview form"}
      >
        <i class="fa fa-eye"></i> Preview
      </button>
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

    {#if isExistingForm}
      <button
        type="button"
        class="btn btn-danger"
        onclick={handleDelete}
        disabled={isDeleting}
        title="Delete this form"
      >
        {#if isDeleting}
          <i class="fa fa-spinner fa-spin"></i>
        {:else}
          <i class="fa fa-trash"></i>
        {/if}
      </button>
    {/if}
  </div>
</div>

<!-- Settings Panel -->
{#if showSettings}
  <div class="settings-panel">
    <div class="settings-panel-header">
      <h4>Form Settings</h4>
      <button type="button" class="btn-close" onclick={toggleSettings} title="Close settings">
        <i class="fa fa-times"></i>
      </button>
    </div>
    <div class="settings-panel-body">
      <div class="form-group">
        <label for="form-description">Description</label>
        <textarea
          id="form-description"
          bind:value={store.formMetadata.description}
          class="form-control"
          placeholder="Optional description for this form..."
          rows="2"
        ></textarea>
      </div>

    </div>
  </div>
{/if}

<style>
  .form-builder-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--crm-r) var(--crm-r4);
    background: var(--crm-c-layer0-bg);
    border-bottom: 1px solid var(--crm-c-gray-200);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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

  .btn-settings {
    background: transparent;
    border: 1px solid var(--crm-c-gray-300);
    color: var(--crm-c-gray-600);
    padding: var(--crm-m) var(--crm-m2);
    border-radius: var(--makeaform-radius);
    cursor: pointer;
    transition: all 0.2s ease;
    align-self: flex-end;
    margin-bottom: 1px;
  }

  .btn-settings:hover {
    background: var(--makeaform-accent-bg);
    border-color: var(--makeaform-accent);
    color: var(--makeaform-accent);
  }

  .toolbar-right .btn-secondary {
    background: var(--crm-c-layer1-bg);
    border: 1px solid var(--crm-c-gray-300);
    color: var(--crm-c-gray-700);
    padding: var(--crm-btn-padding-block) var(--crm-btn-padding-inline);
    border-radius: var(--makeaform-radius);
    font-weight: 600;
    font-size: var(--crm-m3);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toolbar-right .btn-secondary:hover {
    background: var(--crm-c-gray-100);
    border-color: var(--crm-c-gray-400);
  }

  .toolbar-right .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toolbar-right .btn-danger {
    background: transparent;
    border: 1px solid var(--crm-c-danger);
    color: var(--crm-c-danger);
    padding: var(--crm-btn-padding-block) var(--crm-btn-padding-inline);
    border-radius: var(--makeaform-radius);
    font-weight: 600;
    font-size: var(--crm-m3);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toolbar-right .btn-danger:hover {
    background: var(--crm-c-danger);
    color: white;
  }

  .toolbar-right .btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Settings Panel */
  .settings-panel {
    background: var(--crm-c-layer0-bg);
    border-bottom: 1px solid var(--crm-c-gray-200);
    padding: var(--crm-r2) var(--crm-r4);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .settings-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--crm-r2);
  }

  .settings-panel-header h4 {
    margin: 0;
    font-size: var(--crm-font-size);
    font-weight: 700;
    color: var(--crm-c-text);
  }

  .btn-close {
    background: transparent;
    border: none;
    color: var(--crm-c-gray-500);
    cursor: pointer;
    padding: var(--crm-s);
    font-size: var(--crm-font-size);
    transition: color 0.2s ease;
  }

  .btn-close:hover {
    color: var(--crm-c-gray-800);
  }

  .settings-panel-body {
    display: flex;
    gap: var(--crm-r4);
    align-items: flex-start;
  }

  .settings-panel-body .form-group {
    flex: 1;
    max-width: 400px;
  }

  .settings-panel-body textarea {
    width: 100%;
    border: 1px solid var(--crm-input-border-color);
    border-radius: var(--crm-roundness);
    padding: var(--crm-m) var(--crm-m2);
    font-size: var(--crm-m3);
    font-family: inherit;
    resize: vertical;
    background: var(--crm-input-bg);
    color: var(--crm-input-color);
  }

  .settings-panel-body textarea:focus {
    border-color: var(--makeaform-accent);
    outline: none;
    box-shadow: 0 0 0 3px var(--makeaform-accent-bg);
  }

</style>
