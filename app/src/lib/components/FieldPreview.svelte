<script lang="ts">
  import {
    store,
    nextField,
    prevField,
    canGoNext,
    canGoPrev,
  } from "../stores/formStore.svelte";

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
  {:else if store.currentPageFields.length === 0}
    <div class="preview-empty">
      <div class="empty-content">
        <i class="fa fa-plus-circle fa-3x"></i>
        <h2>Add your first field</h2>
        <p>Click "Add Field" in the left panel to get started</p>
      </div>
    </div>
  {:else}
    <div class="form-preview-container">
      <!-- Page Header -->
      {#if store.currentPage}
        <div class="page-header-preview">
          <h2>{store.currentPage["af-fieldset"] || "Form Section"}</h2>
          <div class="page-meta">
            <span class="field-count-badge">
              <i class="fa fa-list"></i>
              {store.currentPageFields.length}
              {store.currentPageFields.length === 1 ? "field" : "fields"}
            </span>
          </div>
        </div>
      {/if}

      <!-- All Fields in Current Page -->
      <div class="questions-list-preview">
        {#each store.currentPageFields as question, index}
          {@const isSelected = store.currentField?.id === question.id}
          {@const inputType = getInputType(question.defn?.input_type || "Text")}

          <div
            class="question-card"
            class:selected={isSelected}
            onclick={() => (store.currentFieldIndex = index)}
            role="button"
            tabindex="0"
          >
            <div class="question-card-header">
              <span class="question-number">{index + 1}</span>
              <h3 class="question-label">
                {question.defn?.label || question.name || "Untitled Question"}
                {#if question.defn?.required}
                  <span class="required-badge">*</span>
                {/if}
              </h3>
            </div>

            <div class="question-card-input">
              {#if inputType === "textarea"}
                <textarea
                  class="preview-input"
                  placeholder={question.defn?.placeholder || ""}
                  rows="3"
                  disabled
                ></textarea>
              {:else if inputType === "select"}
                <select class="preview-input" disabled>
                  <option
                    >{question.defn?.placeholder ||
                      "Select an option..."}</option
                  >
                </select>
              {:else if inputType === "checkbox"}
                <div class="option-preview">
                  <div class="option-item">
                    <input type="checkbox" disabled />
                    <span>Option 1</span>
                  </div>
                  <div class="option-item">
                    <input type="checkbox" disabled />
                    <span>Option 2</span>
                  </div>
                </div>
              {:else if inputType === "radio"}
                <div class="option-preview">
                  <div class="option-item">
                    <input type="radio" disabled />
                    <span>Option 1</span>
                  </div>
                  <div class="option-item">
                    <input type="radio" disabled />
                    <span>Option 2</span>
                  </div>
                </div>
              {:else}
                <input
                  type={inputType}
                  class="preview-input"
                  placeholder={question.defn?.placeholder || ""}
                  disabled
                />
              {/if}
            </div>

            {#if question.defn?.help_text}
              <div class="question-help">
                <i class="fa fa-info-circle"></i>
                {question.defn.help_text}
              </div>
            {/if}
          </div>
        {/each}
      </div>
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

  .page-header-preview {
    background: var(--crm-c-layer0-bg);
    padding: var(--crm-r2) var(--crm-r4);
    border-radius: var(--crm-m2);
    margin-bottom: var(--crm-r2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .page-header-preview h2 {
    margin: 0 0 var(--crm-m) 0;
    font-size: var(--crm-r2);
    font-weight: 700;
    color: var(--crm-c-text);
  }

  .page-meta {
    display: flex;
    gap: var(--crm-m2);
  }

  .field-count-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--crm-s);
    background: var(--makeaform-accent-bg);
    color: var(--makeaform-accent);
    padding: var(--crm-s) var(--crm-m2);
    border-radius: var(--crm-r);
    font-size: var(--crm-m3);
    font-weight: 600;
  }

  .field-count-badge i {
    font-size: var(--crm-small-font-size);
  }

  .questions-list-preview {
    display: flex;
    flex-direction: column;
    gap: var(--crm-r);
  }

  .question-card {
    background: var(--crm-c-layer0-bg);
    border: 2px solid var(--crm-c-gray-200);
    border-radius: var(--crm-m2);
    padding: var(--crm-r2);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .question-card:hover {
    border-color: var(--makeaform-accent);
    box-shadow: 0 4px 12px rgba(from var(--makeaform-accent) r g b / 0.15);
  }

  .question-card.selected {
    border-color: var(--makeaform-accent);
    background: var(--makeaform-accent-bg);
    box-shadow: 0 4px 16px rgba(from var(--makeaform-accent) r g b / 0.2);
  }

  .question-card-header {
    display: flex;
    align-items: center;
    gap: var(--crm-m2);
    margin-bottom: var(--crm-r);
  }

  .question-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--makeaform-accent);
    color: var(--crm-c-text-light);
    border-radius: 50%;
    font-size: var(--crm-m3);
    font-weight: 700;
    flex-shrink: 0;
  }

  .question-card.selected .question-number {
    background: var(--makeaform-accent-hover);
  }

  .question-label {
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

  .question-card-input {
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

  .question-help {
    display: flex;
    align-items: center;
    gap: var(--crm-s);
    font-size: var(--crm-m3);
    color: var(--crm-c-gray-600);
    font-style: italic;
  }

  .question-help i {
    color: var(--makeaform-accent);
    font-size: var(--crm-small-font-size);
  }
</style>
