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

    // Adjust current page index before deletion if needed
    if (store.currentPageIndex >= pageIndex && store.currentPageIndex > 0) {
      store.currentPageIndex = Math.max(0, store.currentPageIndex - 1);
    }
    store.currentFieldIndex = 0;

    deleteElement(page.id);
  }

  // Calculate progress
  const progress = $derived(() => {
    if (store.totalFields === 0) return 0;

    let currentFieldNumber = 0;
    for (let i = 0; i < store.currentPageIndex; i++) {
      const page = store.pages[i];
      if (page["#children"]) {
        currentFieldNumber += page["#children"].filter(
          (c) => c["#tag"] === "af-field",
        ).length;
      }
    }
    currentFieldNumber += store.currentFieldIndex + 1;

    return Math.round((currentFieldNumber / store.totalFields) * 100);
  });

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

<div class="typeform-preview">
  <!-- Progress Bar -->
  <div class="progress-bar">
    <div class="progress-fill" style="width: {progress()}%"></div>
  </div>

  {#if !store.selectedEntity}
    <div class="preview-empty">
      <div class="empty-content">
        <i class="fa fa-arrow-left fa-3x"></i>
        <h2>Get started</h2>
        <p>Select an entity from the left panel to begin building your form</p>
      </div>
    </div>
  {:else if store.pages.length === 0}
    <div class="preview-empty">
      <div class="empty-content">
        <i class="fa fa-plus-circle fa-3x"></i>
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
                        <i class="fa fa-arrow-up"></i>
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
                        <i class="fa fa-arrow-down"></i>
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
                  <i class="fa fa-trash"></i>
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
                        <i class="fa fa-info-circle"></i>
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
                  <i class="fa fa-link"></i>
                  <span>{joinName}</span>
                </div>

                {#if joinFields.length > 0}
                  <div class="join-fields-preview">
                    {#each joinFields as field}
                      {@const inputType = getInputType(field.defn?.input_type || "Text")}

                      <div class="field-card join-field-card">
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
                            <i class="fa fa-info-circle"></i>
                            {field.defn.help_post}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="join-empty">
                    <i class="fa fa-info-circle"></i>
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
        <div style="margin-top: var(--crm-r4); text-align: center;">
          <button
            type="button"
            class={submitButton.class || "af-button btn btn-primary"}
            onclick={() => selectElement(submitButton.id)}
            style="pointer-events: all; cursor: pointer;"
          >
            {#if submitButton["crm-icon"]}
              <i class="fa {submitButton['crm-icon']}"></i>
            {/if}
            {submitButton["#children"]?.[0] || "Submit"}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .typeform-preview {
    position: relative;
    height: 100%;
    background: var(--crm-c-container-bg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .progress-bar {
    height: 4px;
    background: var(--crm-c-gray-200);
    position: relative;
    z-index: 10;
  }

  .progress-fill {
    height: 100%;
    background: var(--makeaform-accent);
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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
    padding: var(--crm-xxl);
  }

  .empty-content i {
    opacity: 0.4;
    margin-bottom: var(--crm-r4);
    color: var(--makeaform-accent);
  }

  .empty-content h2 {
    font-size: var(--crm-l);
    font-weight: 700;
    margin: 0 0 var(--crm-m2) 0;
    color: var(--crm-c-text);
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
    padding: var(--crm-r4);
  }

  .entities-wrapper {
    background: var(--crm-c-layer1-bg);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-m2);
    padding: var(--crm-r2);
  }

  .entity-container {
    background: var(--crm-c-layer0-bg);
    border: 2px solid var(--crm-c-gray-200);
    border-radius: var(--crm-m2);
    padding: var(--crm-r2);
    margin-bottom: var(--crm-r2);
    transition: all 0.2s ease;
  }

  .entity-container:last-child {
    margin-bottom: 0;
  }

  .entity-container.active {
    border-color: var(--makeaform-accent);
    box-shadow: 0 4px 16px rgba(from var(--makeaform-accent) r g b / 0.15);
  }

  .page-header-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--crm-r);
    margin-bottom: var(--crm-m);
  }

  .page-header-content {
    flex: 1;
    cursor: pointer;
  }

  .page-action-buttons {
    display: flex;
    align-items: center;
    gap: var(--crm-m);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .entity-container:hover .page-action-buttons {
    opacity: 1;
  }

  .page-reorder-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--crm-xs1);
  }

  .btn-reorder {
    background: var(--crm-c-layer1-bg);
    border: 1px solid var(--crm-c-gray-300);
    color: var(--crm-c-gray-700);
    cursor: pointer;
    padding: var(--crm-xs1) var(--crm-m);
    border-radius: var(--crm-roundness);
    font-size: var(--crm-small-font-size);
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
    color: var(--crm-c-text-light);
    transform: scale(1.1);
  }

  .btn-reorder i {
    font-size: var(--crm-small-font-size);
  }

  .btn-delete-entity {
    background: transparent;
    border: 1px solid var(--crm-c-gray-300);
    color: var(--crm-c-gray-500);
    cursor: pointer;
    padding: var(--crm-m);
    border-radius: var(--crm-roundness);
    font-size: var(--crm-m3);
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
  }

  .btn-delete-entity:hover {
    background: var(--crm-c-danger);
    border-color: var(--crm-c-danger);
    color: white;
    transform: scale(1.1);
  }

  .container-label-input {
    background: transparent;
    border: 1px solid transparent;
    font-size: var(--crm-r2);
    font-weight: 700;
    color: var(--crm-c-text);
    width: 100%;
    padding: var(--crm-xs1) var(--crm-m);
    margin: 0 0 var(--crm-m) 0;
    border-radius: var(--crm-roundness);
    transition: all 0.15s ease;
  }

  .container-label-input:hover {
    background: var(--crm-c-layer1-bg);
    border-color: var(--crm-c-gray-300);
  }

  .container-label-input:focus {
    outline: none;
    background: var(--crm-c-layer1-bg);
    border-color: var(--makeaform-accent);
    box-shadow: 0 0 0 2px var(--makeaform-accent-bg);
  }

  .fields-list-preview {
    display: flex;
    flex-direction: column;
    gap: var(--crm-r);
  }

  .field-card {
    background: var(--crm-c-layer0-bg);
    border: 2px solid var(--crm-c-gray-200);
    border-radius: var(--crm-m2);
    padding: var(--crm-r2);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .field-card:hover {
    border-color: var(--makeaform-accent);
    box-shadow: 0 4px 12px rgba(from var(--makeaform-accent) r g b / 0.15);
  }

  .field-card.selected {
    border-color: var(--makeaform-accent);
    background: var(--makeaform-accent-bg);
    box-shadow: 0 4px 16px rgba(from var(--makeaform-accent) r g b / 0.2);
  }

  .field-card-header {
    display: flex;
    align-items: center;
    gap: var(--crm-m2);
    margin-bottom: var(--crm-r);
  }

  .field-label {
    margin: 0;
    font-size: var(--crm-r1);
    font-weight: 600;
    color: var(--crm-c-text);
    flex: 1;
  }

  .required-badge {
    color: var(--crm-c-danger);
    margin-left: var(--crm-xs1);
  }

  .field-card-input {
    margin-bottom: var(--crm-m2);
  }

  .preview-input {
    width: 100%;
    border: 1px solid var(--crm-input-border-color);
    border-radius: var(--makeaform-radius);
    padding: var(--crm-m1) var(--crm-m2);
    font-size: var(--crm-m3);
    color: var(--crm-input-color);
    background: var(--crm-c-layer1-bg);
  }

  .preview-input:focus {
    outline: none;
    border-color: var(--makeaform-accent);
    background: var(--crm-input-bg);
  }

  textarea.preview-input {
    resize: vertical;
    font-family: inherit;
  }

  .option-preview {
    display: flex;
    flex-direction: column;
    gap: var(--crm-m1);
  }

  .option-item {
    display: flex;
    align-items: center;
    gap: var(--crm-m1);
    padding: var(--crm-m1);
    background: var(--crm-c-layer1-bg);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-roundness);
  }

  .option-item input {
    margin: 0;
  }

  .option-item span {
    font-size: var(--crm-m3);
    color: var(--crm-c-gray-800);
  }

  .field-help {
    display: flex;
    align-items: center;
    gap: var(--crm-s);
    font-size: var(--crm-m3);
    color: var(--crm-c-gray-600);
    font-style: italic;
  }

  .field-help i {
    color: var(--makeaform-accent);
    font-size: var(--crm-small-font-size);
  }

  .option-more {
    font-size: var(--crm-small-font-size);
    color: var(--crm-c-gray-600);
    font-style: italic;
    padding: var(--crm-s) var(--crm-m1);
  }

  /* Join Entity Section Styles */
  .join-section-preview {
    margin-top: var(--crm-r2);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-m2);
    overflow: hidden;
    background: color-mix(in srgb, var(--crm-c-success) 3%, var(--crm-c-layer0-bg) 97%);
  }

  .join-section-header-preview {
    display: flex;
    align-items: center;
    gap: var(--crm-m1);
    padding: var(--crm-m2) var(--crm-r);
    background: color-mix(in srgb, var(--crm-c-success) 10%, var(--crm-c-layer1-bg) 90%);
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .join-section-header-preview i {
    color: var(--crm-c-success);
    font-size: var(--crm-m3);
  }

  .join-section-header-preview span {
    font-size: var(--crm-m3);
    font-weight: 600;
    color: var(--crm-c-text);
  }

  .join-fields-preview {
    padding: var(--crm-r);
    display: flex;
    flex-direction: column;
    gap: var(--crm-m2);
  }

  .join-field-card {
    border-width: 1px;
  }

  .join-empty {
    display: flex;
    align-items: center;
    gap: var(--crm-m1);
    padding: var(--crm-r);
    color: var(--crm-c-gray-500);
    font-size: var(--crm-m3);
  }

  .join-empty i {
    color: var(--crm-c-gray-400);
  }
</style>
