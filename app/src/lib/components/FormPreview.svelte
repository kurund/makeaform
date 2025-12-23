<script lang="ts">
  import type { FormElement } from "../types";
  import {
    store,
    selectElement,
    deleteElement,
    addElement,
    moveElement,
  } from "../stores/formStore.svelte";

  let { element }: { element: FormElement } = $props();

  const isSelected = $derived(store.selectedElementId === element.id);
  let dragOverContainer = $state(false);
  let isDragging = $state(false);

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    selectElement(element.id);
  }

  function handleDelete(e: MouseEvent) {
    e.stopPropagation();
    if (confirm("Delete this element?")) {
      deleteElement(element.id);
    }
  }

  // Simpler approach: use HTML5 drag API but with proper event handling
  function handleDragStart(e: DragEvent) {
    if (e.dataTransfer && element.id) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", element.id);
      isDragging = true;

      // Store the element ID globally so Canvas can access it
      (window as any).__draggingElementId = element.id;

      console.log("Drag started for element:", element.id);
    }
  }

  function handleDragEnd(e: DragEvent) {
    isDragging = false;
    (window as any).__draggingElementId = null;
    console.log("Drag ended for element:", element.id);
  }

  function handleContainerDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    dragOverContainer = true;
  }

  function handleContainerDragLeave(e: DragEvent) {
    e.stopPropagation();
    dragOverContainer = false;
  }

  function handleContainerDrop(e: DragEvent) {
    dragOverContainer = false;

    if (e.dataTransfer) {
      // Check if it's a reordering operation (has element-id)
      const elementId = e.dataTransfer.getData("application/x-element-id");
      if (elementId) {
        // This is a reordering operation - let it bubble to parent
        console.log("Reordering operation detected, letting event bubble");
        return;
      }

      // Check if it's a new element from palette
      const jsonData = e.dataTransfer.getData("application/json");
      if (jsonData) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const newElement: FormElement = JSON.parse(jsonData);
          addElement(newElement, element.id);
        } catch (err) {
          console.error("Failed to parse dropped element:", err);
        }
      }
    }
  }

  // Render different element types
  function renderField(el: FormElement) {
    const defn = el.defn || {};
    const label = defn.label || el.name || "Field";
    const inputType = defn.input_type || "Text";
    const required = defn.required || false;

    return { label, inputType, required };
  }

  // Check if element can be a container
  const isContainer = $derived(
    element["#tag"] === "fieldset" ||
      element["#tag"] === "div" ||
      element["#tag"] === "container",
  );
</script>

<div
  class="preview-element"
  class:selected={isSelected}
  class:dragging={isDragging}
  onclick={handleClick}
  role="button"
  tabindex="0"
>
  {#if element["#tag"] === "af-field"}
    {@const field = renderField(element)}
    <div class="form-group">
      <label>
        {field.label}
        {#if field.required}
          <span class="crm-marker">*</span>
        {/if}
      </label>

      {#if field.inputType === "TextArea"}
        <textarea class="form-control" rows="3" placeholder={field.label}
        ></textarea>
      {:else if field.inputType === "Select"}
        <select class="form-control">
          <option>- select -</option>
        </select>
      {:else if field.inputType === "CheckBox"}
        <div class="checkbox">
          <label>
            <input type="checkbox" />
            {field.label}
          </label>
        </div>
      {:else if field.inputType === "Radio"}
        <div class="radio">
          <label>
            <input type="radio" name={element.id} /> Option 1
          </label>
        </div>
      {:else if field.inputType === "Date"}
        <input type="text" class="form-control" placeholder="mm/dd/yyyy" />
      {:else if field.inputType === "EntityRef"}
        <input type="text" class="form-control" placeholder="Start typing..." />
      {:else}
        <input type="text" class="form-control" placeholder={field.label} />
      {/if}
    </div>
  {:else if element["#tag"] === "fieldset"}
    <fieldset
      class="preview-fieldset"
      class:drag-over={dragOverContainer}
      class:has-children={element["#children"] &&
        element["#children"].length > 0}
      ondragover={handleContainerDragOver}
      ondragleave={handleContainerDragLeave}
      ondrop={handleContainerDrop}
    >
      {#if element["af-fieldset"]}
        <legend>Entity: {element["af-fieldset"]}</legend>
      {/if}
      <div class="fieldset-content">
        {#if element["#children"] && element["#children"].length > 0}
          {#each element["#children"] as child}
            {#if typeof child === "object" && child["#tag"] === "legend" && child["#children"]}
              <legend>{child["#children"][0]}</legend>
            {:else if typeof child === "object" && child["#tag"]}
              <svelte:self element={child} />
            {/if}
          {/each}
        {:else}
          <div class="container-empty">Drop fields or containers here</div>
        {/if}
      </div>
    </fieldset>
  {:else if element["#tag"] === "div" || element["#tag"] === "container"}
    <div
      class="preview-container"
      class:drag-over={dragOverContainer}
      ondragover={handleContainerDragOver}
      ondragleave={handleContainerDragLeave}
      ondrop={handleContainerDrop}
    >
      <div class="container-label">Container</div>
      {#if element["#children"] && element["#children"].length > 0}
        {#each element["#children"] as child}
          {#if typeof child === "object" && child["#tag"]}
            <svelte:self element={child} />
          {/if}
        {/each}
      {:else}
        <div class="container-empty">Drop fields here</div>
      {/if}
    </div>
  {:else if element["#tag"] === "button"}
    <button type="button" class="btn {element.class || 'btn-default'}">
      {#if element["#children"] && typeof element["#children"][0] === "string"}
        {element["#children"][0]}
      {:else}
        Button
      {/if}
    </button>
  {/if}

  {#if isSelected}
    <div class="element-actions">
      <button
        type="button"
        class="btn btn-xs btn-default drag-handle"
        title="Drag to reorder"
        draggable="true"
        ondragstart={handleDragStart}
        ondragend={handleDragEnd}
        onclick={(e) => e.stopPropagation()}
        style="pointer-events: auto;"
      >
        <i class="fa fa-arrows" style="pointer-events: none;"></i>
      </button>
      <button
        type="button"
        class="btn btn-xs btn-danger"
        onclick={handleDelete}
        title="Delete"
      >
        <i class="fa fa-trash"></i>
      </button>
    </div>
  {/if}
</div>

<style>
  .preview-element {
    position: relative;
    margin: 12px 0;
    padding: 16px;
    border: 2px solid transparent;
    border-radius: 12px;
    transition: all 0.2s ease;
    cursor: move;
    background: #ffffff;
  }

  .preview-element:hover {
    background: #fafafa;
    border-color: #e8e8eb;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .preview-element.selected {
    background: #f3f1ff;
    border-color: #6c5ce7;
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
  }

  .preview-element.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }

  .form-group {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
    color: #2c2c2c;
    font-size: 15px;
  }

  .crm-marker {
    color: #ff6b6b;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    border: 1px solid #e8e8eb;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 15px;
    transition: all 0.2s ease;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    border-color: #6c5ce7;
    outline: none;
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
  }

  .preview-fieldset {
    border: 3px solid #6c5ce7;
    background: linear-gradient(135deg, #f9f8ff 0%, #ffffff 100%);
    padding: 28px;
    margin: 16px 0;
    border-radius: 16px;
    min-height: 160px;
    position: relative;
    box-shadow: 0 2px 12px rgba(108, 92, 231, 0.12);
  }

  .preview-fieldset::before {
    content: "DROP ZONE";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 22px;
    font-weight: 700;
    color: rgba(108, 92, 231, 0.08);
    pointer-events: none;
    letter-spacing: 6px;
  }

  .preview-fieldset.has-children::before {
    display: none;
  }

  .preview-fieldset.drag-over {
    background: linear-gradient(135deg, #fff9e6 0%, #fffef5 100%);
    border-color: #ffb84d;
    border-width: 3px;
    border-style: dashed;
    box-shadow: 0 4px 20px rgba(255, 184, 77, 0.25);
  }

  .preview-fieldset.drag-over::before {
    content: "DROP HERE";
    color: rgba(255, 184, 77, 0.3);
    font-size: 28px;
  }

  .preview-fieldset legend {
    width: auto;
    padding: 10px 24px;
    margin: -28px 0 20px -28px;
    font-size: 13px;
    font-weight: 700;
    border: none;
    background: #6c5ce7;
    color: white;
    border-radius: 16px 0 16px 0;
    box-shadow: 0 3px 8px rgba(108, 92, 231, 0.3);
    position: relative;
    z-index: 1;
    letter-spacing: 0.3px;
  }

  .fieldset-content {
    position: relative;
    z-index: 1;
  }

  .preview-container {
    border: 2px dashed #6c757d;
    border-radius: 4px;
    padding: 20px;
    background: #ffffff;
    min-height: 80px;
    transition: all 0.2s;
    margin: 10px 0;
  }

  .preview-container.drag-over {
    background: #fff3cd;
    border-color: #ffc107;
    border-style: solid;
  }

  .container-label {
    font-size: 11px;
    font-weight: bold;
    color: #6c757d;
    text-transform: uppercase;
    margin-bottom: 10px;
    background: #e9ecef;
    padding: 4px 8px;
    border-radius: 3px;
    display: inline-block;
  }

  .container-empty {
    text-align: center;
    color: #6c757d;
    padding: 30px 20px;
    font-style: italic;
    border: 1px dashed #dee2e6;
    border-radius: 4px;
    background: #f8f9fa;
  }

  .element-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    opacity: 0;
    transition: opacity 0.2s ease;
    display: flex;
    gap: 4px;
  }

  .preview-element.selected .element-actions {
    opacity: 1;
  }

  .element-actions button {
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    transition: all 0.2s ease;
    border: 1px solid #e8e8eb;
  }

  .element-actions .drag-handle {
    cursor: move;
    background: #ffffff;
    color: #6c5ce7;
  }

  .element-actions .drag-handle:hover {
    background: #f3f1ff;
    border-color: #6c5ce7;
  }

  .element-actions .btn-danger {
    background: #ffffff;
    border-color: #e8e8eb;
    color: #ff6b6b;
  }

  .element-actions .btn-danger:hover {
    background: #ffe8e8;
    border-color: #ff6b6b;
  }
</style>
