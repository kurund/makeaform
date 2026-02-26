<script lang="ts">
  import {
    store,
    nextField,
    prevField,
    canGoNext,
    canGoPrev,
    selectElement,
    movePageUp,
    movePageDown,
    gotoField,
    deleteElement,
  } from "../stores/formStore.svelte";

  // Delete an entity/page and all its fields
  function deleteEntity(pageIndex: number) {
    const page = store.pages[pageIndex];
    if (!page || !page.id) return;

    const fieldCount =
      page["#children"]?.filter((c) => c["#tag"] === "af-field").length || 0;
    const entityLabel = page.label || page["af-fieldset"] || "this entity";

    const message =
      fieldCount > 0
        ? `Are you sure you want to delete "${entityLabel}" and its ${fieldCount} field${fieldCount > 1 ? "s" : ""}?\n\nThis action cannot be undone.`
        : `Are you sure you want to delete "${entityLabel}"?\n\nThis action cannot be undone.`;

    if (!confirm(message)) return;

    // Remove the matching entity config (af-entity definition)
    const entityName = page["af-fieldset"];
    if (entityName) {
      const configIndex = store.entityConfigs.findIndex(
        (ec) => ec.name === entityName,
      );
      if (configIndex !== -1) {
        store.entityConfigs.splice(configIndex, 1);
      }
    }

    // Adjust current page index before deletion if needed
    if (store.currentPageIndex >= pageIndex && store.currentPageIndex > 0) {
      store.currentPageIndex = Math.max(0, store.currentPageIndex - 1);
    }
    store.currentFieldIndex = 0;

    deleteElement(page.id);
  }

  function handleNext() {
    if (canGoNext()) {
      nextField();
    }
  }

  function handlePrev() {
    if (canGoPrev()) {
      prevField();
    }
  }

  // Render field input based on type
  function getInputType(fieldType: string) {
    const typeMap: Record<string, string> = {
      Text: "text",
      Number: "number",
      Email: "email",
      Date: "date",
      TextArea: "textarea",
      Select: "select",
      Radio: "radio",
      CheckBox: "checkbox",
      EntityRef: "text",
    };
    return typeMap[fieldType] || "text";
  }

  // Update page/container label
  function updatePageLabel(pageIndex: number, newLabel: string) {
    const page = store.pages[pageIndex];
    if (page) {
      page.label = newLabel;
      store.hasUnsavedChanges = true;
    }
  }
</script>

<div class="formbuilder-preview">
  {#if !store.selectedEntity}
    <div class="preview-empty">
      <div class="empty-content">
        <i class="crm-i fa-arrow-left fa-3x"></i>
        <h2>Get started</h2>
        <p>Select an entity from the left panel to begin building your form</p>
      </div>
    </div>
  {:else if store.pages.length === 0}
    <div class="preview-empty">
      <div class="empty-content">
        <i class="crm-i fa-plus-circle fa-3x"></i>
        <h2>Add your first field</h2>
        <p>Click "Add Field" in the left panel to get started</p>
      </div>
    </div>
  {:else}
    <div class="form-preview-container">
      <!-- All Pages/Entities -->
      <div class="entities-wrapper">
        {#each store.pages as page, pageIndex}
          {@const pageFields =
            page["#children"]?.filter(
              (child) => child["#tag"] === "af-field",
            ) || []}
          {@const pageJoins =
            page["#children"]?.filter(
              (child) => child["af-join"],
            ) || []}
          {@const isActivePage = store.currentPageIndex === pageIndex}

          <div class="entity-container" class:active={isActivePage}>
            <!-- Page/Entity Header -->
            <div
              class="page-header-preview"
              class:active={isActivePage}
              role="button"
              tabindex="0"
            >
              <div
                class="page-header-content"
                onclick={() => gotoField(pageIndex, 0)}
              >
                <input
                  type="text"
                  class="container-label-input"
                  value={page.label || page["af-fieldset"] || "Form Section"}
                  onclick={(e) => e.stopPropagation()}
                  oninput={(e) =>
                    updatePageLabel(
                      pageIndex,
                      (e.target as HTMLInputElement).value,
                    )}
                  placeholder="Container Label"
                />
              </div>
              <div class="page-action-buttons">
                {#if store.pages.length > 1}
                  <div class="page-reorder-buttons">
                    {#if pageIndex > 0}
                      <button
                        type="button"
                        class="btn-reorder"
                        onclick={(e) => {
                          e.stopPropagation();
                          movePageUp(pageIndex);
                        }}
                        title="Move up"
                      >
                        <i class="crm-i fa-arrow-up"></i>
                      </button>
                    {/if}
                    {#if pageIndex < store.pages.length - 1}
                      <button
                        type="button"
                        class="btn-reorder"
                        onclick={(e) => {
                          e.stopPropagation();
                          movePageDown(pageIndex);
                        }}
                        title="Move down"
                      >
                        <i class="crm-i fa-arrow-down"></i>
                      </button>
                    {/if}
                  </div>
                {/if}
                <button
                  type="button"
                  class="btn-delete-entity"
                  onclick={(e) => {
                    e.stopPropagation();
                    deleteEntity(pageIndex);
                  }}
                  title="Delete entity and all its fields"
                >
                  <i class="crm-i fa-trash"></i>
                </button>
              </div>
            </div>

            <!-- All Fields in This Page -->
            {#if pageFields.length > 0}
              <div class="fields-list-preview">
                {#each pageFields as field, fieldIndex}
                  {@const isSelected =
                    isActivePage && store.currentFieldIndex === fieldIndex}
                  {@const inputType = getInputType(
                    field.defn?.input_type || "Text",
                  )}

                  <div
                    class="field-card"
                    class:selected={isSelected}
                    onclick={() => gotoField(pageIndex, fieldIndex)}
                    role="button"
                    tabindex="0"
                  >
                    <div class="field-card-header">
                      <h3 class="field-label">
                        {field.defn?.label || field.name || "Untitled Field"}
                        {#if field.defn?.required}
                          <span class="required-badge">*</span>
                        {/if}
                      </h3>
                    </div>

                    <div class="field-card-input">
                      {#if inputType === "textarea"}
                        <textarea
                          class="preview-input"
                          placeholder={field.defn?.placeholder || ""}
                          rows="3"
                          disabled
                        ></textarea>
                      {:else if inputType === "select"}
                        <select class="preview-input" disabled>
                          <option value=""
                            >{field.defn?.placeholder ||
                              "Select an option..."}</option
                          >
                          {#if field.defn?.options?.length}
                            {#each field.defn.options as option}
                              <option value={option.id}
                                >{option.label || option.id}</option
                              >
                            {/each}
                          {/if}
                        </select>
                      {:else if inputType === "checkbox"}
                        {#if field.defn?.options?.length}
                          <div class="option-preview">
                            {#each field.defn.options.slice(0, 4) as option}
                              <div class="option-item">
                                <input type="checkbox" disabled />
                                <span>{option.label || option.id}</span>
                              </div>
                            {/each}
                            {#if field.defn.options.length > 4}
                              <div class="option-more">
                                +{field.defn.options.length - 4} more options
                              </div>
                            {/if}
                          </div>
                        {:else}
                          <input
                            type="checkbox"
                            class="preview-checkbox"
                            disabled
                          />
                        {/if}
                      {:else if inputType === "radio"}
                        {#if field.defn?.options?.length}
                          <div class="option-preview">
                            {#each field.defn.options.slice(0, 4) as option}
                              <div class="option-item">
                                <input type="radio" disabled />
                                <span>{option.label || option.id}</span>
                              </div>
                            {/each}
                            {#if field.defn.options.length > 4}
                              <div class="option-more">
                                +{field.defn.options.length - 4} more options
                              </div>
                            {/if}
                          </div>
                        {:else}
                          <input type="radio" class="preview-radio" disabled />
                        {/if}
                      {:else}
                        <input
                          type={inputType}
                          class="preview-input"
                          placeholder={field.defn?.placeholder || ""}
                          disabled
                        />
                      {/if}
                    </div>

                    {#if field.defn?.help_post}
                      <div class="field-help">
                        <i class="crm-i fa-info-circle"></i>
                        {field.defn.help_post}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Join Entity Sections -->
            {#each pageJoins as joinElement}
              {@const joinName = joinElement["af-join"]}
              {@const joinFields = joinElement["#children"]?.filter((c: any) => c["#tag"] === "af-field") || []}

              <div class="join-section-preview">
                <div class="join-section-header-preview">
                  <i class="crm-i fa-link"></i>
                  <span>{joinName}</span>
                </div>

                {#if joinFields.length > 0}
                  <div class="join-fields-preview">
                    {#each joinFields as field}
                      {@const inputType = getInputType(field.defn?.input_type || "Text")}

                      <div
                        class="field-card join-field-card"
                        class:selected={store.selectedElementId === field.id}
                        onclick={() => selectElement(field.id)}
                        role="button"
                        tabindex="0"
                      >
                        <div class="field-card-header">
                          <h3 class="field-label">
                            {field.defn?.label || field.name || "Untitled Field"}
                            {#if field.defn?.required}
                              <span class="required-badge">*</span>
                            {/if}
                          </h3>
                        </div>

                        <div class="field-card-input">
                          {#if inputType === "textarea"}
                            <textarea
                              class="preview-input"
                              placeholder={field.defn?.placeholder || ""}
                              rows="3"
                              disabled
                            ></textarea>
                          {:else if inputType === "select"}
                            <select class="preview-input" disabled>
                              <option value="">{field.defn?.placeholder || "Select an option..."}</option>
                              {#if field.defn?.options?.length}
                                {#each field.defn.options as option}
                                  <option value={option.id}>{option.label || option.id}</option>
                                {/each}
                              {/if}
                            </select>
                          {:else}
                            <input
                              type={inputType}
                              class="preview-input"
                              placeholder={field.defn?.placeholder || ""}
                              disabled
                            />
                          {/if}
                        </div>

                        {#if field.defn?.help_post}
                          <div class="field-help">
                            <i class="crm-i fa-info-circle"></i>
                            {field.defn.help_post}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="join-empty">
                    <i class="crm-i fa-info-circle"></i>
                    <span>No fields added yet</span>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      </div>

      <!-- Submit Button Preview -->
      {#each store.formElements.filter((el) => el["#tag"] === "button") as submitButton}
        <div style="margin-top: var(--crm-l-reg-4); text-align: center;">
          <button
            type="button"
            class={submitButton.class || "af-button btn btn-primary"}
            onclick={() => selectElement(submitButton.id)}
            style="pointer-events: all; cursor: pointer;"
          >
            {#if submitButton["crm-icon"]}
              <i class="crm-i {submitButton['crm-icon']}"></i>
            {/if}
            {submitButton["#children"]?.[0] || "Submit"}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .formbuilder-preview {
    position: relative;
    height: 100%;
    background: var(--crm-container-bg-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .preview-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--crm-c-gray-600);
  }

  .empty-content {
    text-align: center;
    max-width: 400px;
    padding: var(--crm-l-large-2);
  }

  .empty-content :global(i) {
    opacity: 0.4;
    margin-bottom: var(--crm-l-reg-4);
    color: var(--makeaform-accent);
  }

  .empty-content h2 {
    font-size: var(--crm-l-large);
    font-weight: 700;
    margin: 0 0 var(--crm-l-medium-2) 0;
    color: var(--crm-text-color);
  }

  .empty-content p {
    font-size: var(--crm-font-size);
    margin: 0;
    line-height: 1.5;
    color: var(--crm-c-gray-600);
  }

  .form-preview-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--crm-l-reg-4);
  }

  .entities-wrapper {
    background: var(--crm-layer1-bg-color);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-l-medium-2);
    padding: var(--crm-l-reg-2);
  }

  .entity-container {
    background: var(--crm-paper);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-l-medium-2);
    padding: var(--crm-l-reg);
    margin-bottom: var(--crm-l-reg);
    transition: all 0.2s ease;
    box-shadow: var(--makeaform-shadow-sm);
  }

  .entity-container:last-child {
    margin-bottom: 0;
  }

  .entity-container.active {
    border-color: var(--makeaform-accent);
    box-shadow: var(--makeaform-shadow-md);
  }

  .page-header-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--crm-l-reg);
    margin-bottom: var(--crm-l-medium);
    padding-bottom: var(--crm-l-medium);
    border-bottom: 1px solid var(--crm-c-gray-100);
  }

  .page-header-content {
    flex: 1;
    cursor: pointer;
  }

  .page-action-buttons {
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .entity-container:hover .page-action-buttons {
    opacity: 1;
  }

  .page-reorder-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--crm-l-xsmall-1);
  }

  .btn-reorder {
    background: var(--crm-layer1-bg-color);
    border: 1px solid var(--crm-c-gray-300);
    color: var(--crm-c-gray-700);
    cursor: pointer;
    padding: var(--crm-l-xsmall-1) var(--crm-l-medium);
    border-radius: var(--crm-l-radius);
    font-size: var(--crm-font-small-size);
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }

  .btn-reorder:hover {
    background: var(--makeaform-accent);
    border-color: var(--makeaform-accent);
    color: var(--crm-text-light-color);
  }

  .btn-reorder :global(i) {
    font-size: var(--crm-font-small-size);
  }

  .btn-delete-entity {
    background: transparent;
    border: 1px solid var(--crm-c-gray-300);
    color: var(--crm-c-gray-500);
    cursor: pointer;
    padding: var(--crm-l-medium);
    border-radius: var(--crm-l-radius);
    font-size: var(--crm-l-medium-3);
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
  }

  .btn-delete-entity:hover {
    background: var(--crm-danger-color);
    border-color: var(--crm-danger-color);
    color: white;
  }

  .container-label-input {
    background: transparent;
    border: 1px solid transparent;
    font-size: var(--crm-l-reg-2);
    font-weight: 700;
    color: var(--crm-text-color);
    width: 100%;
    padding: var(--crm-l-xsmall-1) var(--crm-l-medium);
    margin: 0 0 var(--crm-l-medium) 0;
    border-radius: var(--crm-l-radius);
    transition: all 0.15s ease;
  }

  .container-label-input:hover {
    background: var(--crm-layer1-bg-color);
    border-color: var(--crm-c-gray-300);
  }

  .container-label-input:focus {
    outline: none;
    background: var(--crm-layer1-bg-color);
    border-color: var(--makeaform-accent);
    box-shadow: var(--makeaform-shadow-focus);
  }

  .fields-list-preview {
    display: flex;
    flex-direction: column;
    gap: var(--crm-l-medium-2);
  }

  .field-card {
    background: var(--crm-paper);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-l-medium-2);
    padding: var(--crm-l-reg);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .field-card:hover {
    border-color: var(--crm-c-gray-400);
    box-shadow: var(--makeaform-shadow-sm);
  }

  .field-card.selected {
    border-color: var(--makeaform-accent);
    background: var(--makeaform-accent-bg);
    box-shadow: var(--makeaform-shadow-md);
  }

  .field-card-header {
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-2);
    margin-bottom: var(--crm-l-medium-2);
  }

  .field-label {
    margin: 0;
    font-size: var(--crm-l-reg-1);
    font-weight: 600;
    color: var(--crm-text-color);
    flex: 1;
  }

  .required-badge {
    color: var(--crm-danger-color);
    margin-left: var(--crm-l-xsmall-1);
  }

  .field-card-input {
    margin-bottom: var(--crm-l-medium-2);
  }

  .preview-input {
    width: 100%;
    border: 1px solid var(--crm-input-border-color);
    border-radius: var(--makeaform-radius-sm);
    padding: var(--crm-l-small) var(--crm-l-medium-2);
    font-size: var(--crm-font-small-size);
    color: var(--crm-input-color);
    background: var(--crm-layer1-bg-color);
  }

  .preview-input:focus {
    outline: none;
    border-color: var(--makeaform-accent);
    background: var(--crm-input-bg-color);
  }

  textarea.preview-input {
    resize: vertical;
    font-family: inherit;
  }

  .option-preview {
    display: flex;
    flex-direction: column;
    gap: var(--crm-l-medium-1);
  }

  .option-item {
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-medium-1);
    background: var(--crm-layer1-bg-color);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-l-radius);
  }

  .option-item input {
    margin: 0;
  }

  .option-item span {
    font-size: var(--crm-l-medium-3);
    color: var(--crm-c-gray-800);
  }

  .field-help {
    display: flex;
    align-items: center;
    gap: var(--crm-l-small);
    font-size: var(--crm-font-small-size);
    color: var(--crm-c-gray-500);
    font-style: italic;
  }

  .field-help :global(i) {
    color: var(--crm-c-gray-400);
    font-size: var(--crm-font-small-size);
  }

  .option-more {
    font-size: var(--crm-font-small-size);
    color: var(--crm-c-gray-600);
    font-style: italic;
    padding: var(--crm-l-small) var(--crm-l-medium-1);
  }

  /* Join Entity Section Styles */
  .join-section-preview {
    margin-top: var(--crm-l-reg-2);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-l-medium-2);
    overflow: hidden;
    background: color-mix(in srgb, var(--crm-success-color) 3%, var(--crm-paper) 97%);
  }

  .join-section-header-preview {
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-medium-2) var(--crm-l-reg);
    background: color-mix(in srgb, var(--crm-success-color) 10%, var(--crm-layer1-bg-color) 90%);
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .join-section-header-preview :global(i) {
    color: var(--crm-success-color);
    font-size: var(--crm-l-medium-3);
  }

  .join-section-header-preview span {
    font-size: var(--crm-l-medium-3);
    font-weight: 600;
    color: var(--crm-text-color);
  }

  .join-fields-preview {
    padding: var(--crm-l-reg);
    display: flex;
    flex-direction: column;
    gap: var(--crm-l-medium-2);
  }

  .join-field-card {
    border-width: 1px;
  }

  .join-empty {
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-reg);
    color: var(--crm-c-gray-500);
    font-size: var(--crm-l-medium-3);
  }

  .join-empty :global(i) {
    color: var(--crm-c-gray-400);
  }
</style>
