<script lang="ts">
  import EntitySelector from "./EntitySelector.svelte";
  import {
    store,
    gotoField,
    deleteElement,
    addElement,
    selectElement,
    setSelectedEntity,
    setEntityFields,
  } from "../stores/formStore.svelte";
  import { getEntityFields } from "../api/civicrm";

  // Track which fields are already in the form
  const usedFields = $derived(() => {
    const fields = new Set<string>();
    const collectFields = (elements: any[]): void => {
      for (const el of elements) {
        if (el["#tag"] === "af-field" && el.name) {
          fields.add(el.name);
        }
        if (el["#children"]) {
          collectFields(el["#children"]);
        }
      }
    };
    collectFields(store.formElements);
    return fields;
  });

  // Get available fields to add
  const availableFields = $derived(() => {
    if (!store.selectedEntity || !store.entityFields) return [];

    const used = usedFields();
    return Object.entries(store.entityFields)
      .filter(([fieldName]) => {
        return !used.has(fieldName);
      })
      .map(([fieldName, field]) => ({
        name: fieldName,
        label: field.label || field.title || fieldName,
        field: field,
      }));
  });

  async function handlePageClick(pageIndex: number) {
    gotoField(pageIndex, 0);

    // Load entity fields for the clicked page
    const page = store.pages[pageIndex];
    if (page) {
      const entityName = page["af-fieldset"];
      if (entityName && entityName !== store.selectedEntity) {
        setSelectedEntity(entityName);

        // Check if we already have fields from loadAdminData
        const existingFields = store.adminData?.fields?.[entityName];
        if (existingFields) {
          setEntityFields(existingFields);
        } else {
          // Fallback to fetching fields if not in adminData
          try {
            const fields = await getEntityFields(entityName);
            setEntityFields(fields);
          } catch (error) {
            console.error("Failed to load entity fields:", error);
          }
        }
      }
    }
  }

  function handleFieldClick(pageIndex: number, fieldIndex: number) {
    gotoField(pageIndex, fieldIndex);
  }

  function handleAddField(fieldName: string, field: any) {
    if (!store.currentPage) return;

    const newQuestion = {
      "#tag": "af-field" as const,
      name: fieldName,
      defn: {
        label: field.label || field.title || fieldName,
        input_type: field.input_type || "Text",
        required: field.required || false,
      },
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    addElement(newQuestion, store.currentPage.id);

    // Navigate to the new field
    const newFieldIndex = store.currentPageFields.length - 1;
    gotoField(store.currentPageIndex, newFieldIndex);
  }

  function handleDeleteField(
    pageIndex: number,
    fieldIndex: number,
    fieldId: string,
    e: Event,
  ) {
    e.stopPropagation();

    if (confirm("Delete this field?")) {
      deleteElement(fieldId);

      // Navigate to previous field or stay on first
      if (fieldIndex > 0) {
        gotoField(pageIndex, fieldIndex - 1);
      } else {
        gotoField(pageIndex, 0);
      }
    }
  }

  const isCurrentField = (pageIdx: number, fieldIdx: number) => {
    return (
      store.currentPageIndex === pageIdx && store.currentFieldIndex === fieldIdx
    );
  };

  let showAvailableFields = $state(false);
</script>

<div class="question-navigator">
  <div class="navigator-header">
    <h3>Form Builder</h3>
  </div>

  <EntitySelector />

  <div class="navigator-content">
    {#if !store.selectedEntity}
      <div class="navigator-empty">
        <i class="fa fa-arrow-up fa-2x"></i>
        <p><strong>Select an entity</strong></p>
        <p>to start building your form</p>
      </div>
    {:else if store.pages.length === 0}
      <div class="navigator-empty">
        <i class="fa fa-inbox fa-2x"></i>
        <p><strong>No pages yet</strong></p>
        <p>Add questions to create pages</p>
      </div>
    {:else}
      <div class="pages-list">
        {#each store.pages as page, pageIndex}
          {@const questions =
            page["#children"]?.filter((q) => q["#tag"] === "af-field") || []}
          {@const pageName = page["af-fieldset"] || `Page ${pageIndex + 1}`}

          <div class="page-item">
            <div
              class="page-header"
              class:active={store.currentPageIndex === pageIndex}
              onclick={() => handlePageClick(pageIndex)}
              role="button"
              tabindex="0"
            >
              <i class="fa fa-file-text-o"></i>
              <span class="page-name">{pageName}</span>
              <span class="question-count">{questions.length}</span>
            </div>

            {#if questions.length > 0}
              <div class="questions-list">
                {#each questions as question, questionIndex}
                  {@const label =
                    question.defn?.label || question.name || "Untitled"}

                  <div
                    class="question-item"
                    class:active={isCurrentField(pageIndex, questionIndex)}
                    onclick={() => handleFieldClick(pageIndex, questionIndex)}
                    role="button"
                    tabindex="0"
                  >
                    <span class="question-number">{questionIndex + 1}</span>
                    <span class="question-label">{label}</span>
                    <button
                      type="button"
                      class="btn-delete"
                      onclick={(e) =>
                        handleDeleteField(
                          pageIndex,
                          questionIndex,
                          question.id,
                          e,
                        )}
                      title="Delete field"
                    >
                      <i class="fa fa-trash"></i>
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Submit Button Section -->
      {#each store.formElements.filter((el) => el["#tag"] === "button") as submitButton}
        <div class="pages-list" style="margin-top: var(--crm-r);">
          <div class="page-item">
            <div
              class="page-header"
              class:active={store.selectedElementId === submitButton.id}
              onclick={() => selectElement(submitButton.id)}
              role="button"
              tabindex="0"
            >
              <i class="fa fa-paper-plane"></i>
              <span class="page-name">Submit Button</span>
            </div>
          </div>
        </div>
      {/each}

      {#if store.currentPage}
        <div class="navigator-actions">
          <button
            type="button"
            class="btn btn-primary btn-block"
            onclick={() => (showAvailableFields = !showAvailableFields)}
          >
            <i class="fa fa-plus"></i>
            {showAvailableFields ? "Hide Fields" : "Add Field"}
          </button>
        </div>

        {#if showAvailableFields}
          <div class="available-fields">
            <div class="available-fields-header">
              <h4>Available Fields</h4>
              <span class="field-count">{availableFields().length}</span>
            </div>

            {#if availableFields().length === 0}
              <div class="no-fields">
                <i class="fa fa-check-circle"></i>
                <p>All fields added!</p>
              </div>
            {:else}
              <div class="fields-list">
                {#each availableFields() as item}
                  <button
                    type="button"
                    class="field-item"
                    onclick={() => handleAddField(item.name, item.field)}
                  >
                    <i class="fa fa-plus-circle"></i>
                    <span>{item.label}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</div>

<style>
  .question-navigator {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--crm-c-layer0-bg);
  }

  .navigator-header {
    padding: var(--crm-r2);
    background: var(--crm-c-layer0-bg);
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .navigator-header h3 {
    margin: 0;
    font-size: var(--crm-font-size);
    font-weight: 700;
    color: var(--crm-c-text);
    letter-spacing: 0.3px;
  }

  .navigator-content {
    flex: 1;
    overflow-y: auto;
    background: var(--crm-c-layer1-bg);
  }

  .navigator-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--crm-xl) var(--crm-r2);
    color: var(--crm-c-gray-400);
    text-align: center;
  }

  .navigator-empty i {
    margin-bottom: var(--crm-r);
    opacity: 0.4;
    color: var(--makeaform-accent);
  }

  .navigator-empty p {
    margin: var(--crm-xs1) 0;
    font-size: var(--crm-m3);
    color: var(--crm-c-gray-600);
  }

  .navigator-empty p strong {
    color: var(--crm-c-gray-800);
    font-weight: 600;
  }

  .pages-list {
    padding: var(--crm-m2);
  }

  .page-item {
    margin-bottom: var(--crm-r);
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: var(--crm-m1);
    padding: var(--crm-m2) var(--crm-m3);
    background: var(--crm-c-layer0-bg);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--makeaform-radius);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .page-header:hover {
    border-color: var(--makeaform-accent);
    background: var(--crm-c-layer1-bg);
  }

  .page-header.active {
    background: var(--makeaform-accent-bg);
    border-color: var(--makeaform-accent);
    box-shadow: 0 2px 8px rgba(from var(--makeaform-accent) r g b / 0.15);
  }

  .page-header i {
    color: var(--makeaform-accent);
    font-size: var(--crm-font-size);
  }

  .page-name {
    flex: 1;
    font-size: var(--crm-m3);
    font-weight: 600;
    color: var(--crm-c-text);
  }

  .question-count {
    font-size: var(--crm-small-font-size);
    font-weight: 700;
    color: var(--crm-c-gray-600);
    background: var(--crm-c-gray-100);
    padding: 2px var(--crm-m);
    border-radius: var(--crm-m1);
  }

  .page-header.active .question-count {
    background: var(--makeaform-accent);
    color: var(--crm-c-text-light);
  }

  .questions-list {
    margin-top: var(--crm-m);
    padding-left: var(--crm-r4);
  }

  .question-item {
    display: flex;
    align-items: center;
    gap: var(--crm-m1);
    padding: var(--crm-m1) var(--crm-m2);
    background: var(--crm-c-layer0-bg);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-roundness);
    cursor: pointer;
    transition: all 0.15s ease;
    margin-bottom: var(--crm-s);
  }

  .question-item:hover {
    border-color: var(--makeaform-accent);
    background: var(--crm-c-layer1-bg);
    transform: translateX(2px);
  }

  .question-item.active {
    background: var(--makeaform-accent-bg);
    border-color: var(--makeaform-accent);
    box-shadow: 0 2px 6px rgba(from var(--makeaform-accent) r g b / 0.12);
  }

  .question-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--crm-c-gray-100);
    border-radius: 50%;
    font-size: var(--crm-small-font-size);
    font-weight: 700;
    color: var(--crm-c-gray-600);
  }

  .question-item.active .question-number {
    background: var(--makeaform-accent);
    color: var(--crm-c-text-light);
  }

  .question-label {
    flex: 1;
    font-size: var(--crm-m3);
    color: var(--crm-c-gray-800);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-delete {
    opacity: 0;
    padding: var(--crm-xs1) var(--crm-m);
    background: transparent;
    border: none;
    color: var(--crm-c-danger);
    cursor: pointer;
    transition: all 0.15s ease;
    border-radius: var(--crm-roundness);
  }

  .question-item:hover .btn-delete {
    opacity: 1;
  }

  .btn-delete:hover {
    background: var(--crm-c-danger-light);
  }

  .navigator-actions {
    padding: var(--crm-r);
    border-top: 1px solid var(--crm-c-gray-200);
    background: var(--crm-c-layer0-bg);
  }

  .btn-block {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--crm-m);
  }

  .btn-primary {
    background: var(--crm-c-primary);
    border: 1px solid var(--crm-c-primary);
    color: var(--crm-c-primary-text);
    padding: var(--crm-m1) var(--crm-r);
    border-radius: var(--makeaform-radius);
    font-weight: 600;
    font-size: var(--crm-m3);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    background: var(--crm-c-primary-hover);
    border-color: var(--crm-c-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(from var(--crm-c-primary) r g b / 0.3);
  }

  .btn-primary i {
    font-size: var(--crm-m3);
  }

  .available-fields {
    background: var(--crm-c-layer0-bg);
    border-top: 1px solid var(--crm-c-gray-200);
    max-height: 400px;
    overflow-y: auto;
  }

  .available-fields-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--crm-m2) var(--crm-r);
    border-bottom: 1px solid var(--crm-c-gray-200);
    background: var(--crm-c-layer1-bg);
  }

  .available-fields-header h4 {
    margin: 0;
    font-size: var(--crm-small-font-size);
    font-weight: 700;
    color: var(--crm-c-gray-800);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .field-count {
    font-size: var(--crm-small-font-size);
    font-weight: 700;
    color: var(--crm-c-gray-600);
    background: var(--crm-c-gray-200);
    padding: 2px var(--crm-m);
    border-radius: var(--crm-m1);
  }

  .no-fields {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--crm-xxl) var(--crm-r2);
    color: var(--crm-c-gray-600);
    text-align: center;
  }

  .no-fields i {
    font-size: var(--crm-l);
    color: var(--makeaform-accent);
    margin-bottom: var(--crm-m2);
    opacity: 0.6;
  }

  .no-fields p {
    margin: 0;
    font-size: var(--crm-m3);
    font-weight: 500;
  }

  .fields-list {
    padding: var(--crm-m);
  }

  .field-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--crm-m1);
    padding: var(--crm-m1) var(--crm-m2);
    background: var(--crm-c-layer0-bg);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-roundness);
    cursor: pointer;
    transition: all 0.15s ease;
    margin-bottom: var(--crm-s);
    text-align: left;
  }

  .field-item:hover {
    background: var(--makeaform-accent-bg);
    border-color: var(--makeaform-accent);
    transform: translateX(2px);
  }

  .field-item i {
    color: var(--makeaform-accent);
    font-size: var(--crm-m3);
  }

  .field-item span {
    font-size: var(--crm-m3);
    color: var(--crm-c-text);
    font-weight: 500;
  }
</style>

