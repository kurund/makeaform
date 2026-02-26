<script lang="ts">
  import {
    store,
    setIsSaving,
    setHasUnsavedChanges,
  } from "../stores/formStore.svelte";
  import { saveForm, deleteForm } from "../api/civicrm";

  let { onSave = () => {}, onDelete = () => {} } = $props();

  let autoGeneratePath = $state(true);
  let showSettings = $state(false);
  let isDeleting = $state(false);

  // Check if this is an existing form (editing mode)
  const isExistingForm = $derived(
    store.formMetadata.name &&
      store.formMetadata.name !== "new_form" &&
      (store.formMetadata.name.startsWith("afform") ||
        store.formMetadata.name.startsWith("Afform")),
  );

  // Auto-generate path from title on first input (only for new forms)
  function handleTitleChange(e: Event) {
    if (
      !isExistingForm &&
      autoGeneratePath &&
      !store.formMetadata.server_route
    ) {
      const title = (e.target as HTMLInputElement).value;
      const path = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      store.formMetadata.server_route = "civicrm/" + path;
    }
  }

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
        <i class="crm-i fa-cog"></i>
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
        title={store.hasUnsavedChanges
          ? "Save first to preview"
          : "Preview form"}
      >
        <i class="crm-i fa-eye"></i> Preview
      </button>
    {/if}

    <button
      type="button"
      class="btn btn-primary"
      onclick={handleSave}
      disabled={store.isSaving}
    >
      {#if store.isSaving}
        <i class="crm-i fa-spinner fa-spin"></i> Saving...
      {:else}
        <i class="crm-i fa-save"></i> Save
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
          <i class="crm-i fa-spinner fa-spin"></i>
        {:else}
          <i class="crm-i fa-trash"></i>
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
      <button
        type="button"
        class="btn-close"
        onclick={toggleSettings}
        title="Close settings"
      >
        <i class="crm-i fa-times"></i>
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
    padding: var(--crm-l-medium-2) var(--crm-l-reg-2);
    background: var(--crm-paper);
    border-bottom: 1px solid var(--crm-c-gray-200);
    box-shadow: var(--makeaform-shadow-sm);
  }

  .toolbar-left {
    flex: 1;
  }

  .form-name-group {
    display: flex;
    gap: var(--crm-l-reg-2);
    align-items: flex-end;
  }

  .form-group {
    margin: 0;
  }

  .form-group label {
    display: block;
    font-size: var(--crm-font-small-size);
    font-weight: 600;
    color: var(--crm-c-gray-500);
    margin-bottom: var(--crm-l-small);
    text-transform: none;
    letter-spacing: 0;
  }

  .form-group input {
    border: 1px solid var(--crm-input-border-color);
    border-radius: var(--makeaform-radius-sm);
    padding: var(--crm-l-small) var(--crm-l-medium-2);
    font-size: var(--crm-font-small-size);
    min-width: 200px;
    transition: all 0.2s ease;
    background: var(--crm-input-bg-color);
    color: var(--crm-input-color);
  }

  .form-group input:hover {
    border-color: var(--makeaform-accent);
  }

  .form-group input:focus {
    border-color: var(--makeaform-accent);
    outline: none;
    box-shadow: var(--makeaform-shadow-focus);
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
    gap: var(--crm-l-medium-2);
  }

  .toolbar-right .label {
    font-size: var(--crm-font-small-size);
    padding: 2px var(--crm-l-medium-2);
    border-radius: 999px;
    font-weight: 600;
  }

  .toolbar-right .label-warning {
    background: var(--crm-warning-light-color);
    color: var(--crm-warning-color);
  }

  .toolbar-right .label-success {
    background: var(--crm-success-light-color);
    color: var(--crm-success-color);
  }

  .toolbar-right .btn-primary {
    background: var(--crm-primary-color);
    border-color: var(--crm-primary-color);
    color: var(--crm-primary-text-color);
    padding: var(--crm-btn-padding-block) var(--crm-btn-padding-inline);
    border-radius: var(--makeaform-radius);
    font-weight: 600;
    font-size: var(--crm-l-medium-3);
    transition: all 0.2s ease;
  }

  .toolbar-right .btn-primary:hover {
    background: var(--crm-primary-hover-color);
    border-color: var(--crm-primary-hover-color);
  }

  .toolbar-right .btn-primary:disabled {
    background: var(--crm-c-gray-400);
    border-color: var(--crm-c-gray-400);
  }

  .btn-settings {
    background: transparent;
    border: 1px solid var(--crm-c-gray-300);
    color: var(--crm-c-gray-600);
    padding: var(--crm-l-medium) var(--crm-l-medium-2);
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
    background: var(--crm-layer1-bg-color);
    border: 1px solid var(--crm-c-gray-300);
    color: var(--crm-c-gray-700);
    padding: var(--crm-btn-padding-block) var(--crm-btn-padding-inline);
    border-radius: var(--makeaform-radius);
    font-weight: 600;
    font-size: var(--crm-l-medium-3);
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
    border: 1px solid var(--crm-danger-color);
    color: var(--crm-danger-color);
    padding: var(--crm-btn-padding-block) var(--crm-btn-padding-inline);
    border-radius: var(--makeaform-radius);
    font-weight: 600;
    font-size: var(--crm-l-medium-3);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toolbar-right .btn-danger:hover {
    background: var(--crm-danger-color);
    color: white;
  }

  .toolbar-right .btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Settings Panel */
  .settings-panel {
    background: var(--crm-paper);
    border-bottom: 1px solid var(--crm-c-gray-200);
    padding: var(--crm-l-reg-2) var(--crm-l-reg-4);
    box-shadow: var(--makeaform-shadow-md);
  }

  .settings-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--crm-l-reg-2);
  }

  .settings-panel-header h4 {
    margin: 0;
    font-size: var(--crm-font-size);
    font-weight: 700;
    color: var(--crm-text-color);
  }

  .btn-close {
    background: transparent;
    border: none;
    color: var(--crm-c-gray-500);
    cursor: pointer;
    padding: var(--crm-l-small);
    font-size: var(--crm-font-size);
    transition: color 0.2s ease;
  }

  .btn-close:hover {
    color: var(--crm-c-gray-800);
  }

  .settings-panel-body {
    display: flex;
    gap: var(--crm-l-reg-4);
    align-items: flex-start;
  }

  .settings-panel-body .form-group {
    flex: 1;
    max-width: 400px;
  }

  .settings-panel-body textarea {
    width: 100%;
    border: 1px solid var(--crm-input-border-color);
    border-radius: var(--crm-l-radius);
    padding: var(--crm-l-medium) var(--crm-l-medium-2);
    font-size: var(--crm-l-medium-3);
    font-family: inherit;
    resize: vertical;
    background: var(--crm-input-bg-color);
    color: var(--crm-input-color);
  }

  .settings-panel-body textarea:focus {
    border-color: var(--makeaform-accent);
    outline: none;
    box-shadow: var(--makeaform-shadow-focus);
  }
</style>
