<script lang="ts">
  import type { FormElement } from '../types';
  import { store, selectElement, deleteElement, addElement, moveElement } from '../stores/formStore.svelte';

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
    if (confirm('Delete this element?')) {
      deleteElement(element.id);
    }
  }

  // Simpler approach: use HTML5 drag API but with proper event handling
  function handleDragStart(e: DragEvent) {
    if (e.dataTransfer && element.id) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', element.id);
      isDragging = true;

      // Store the element ID globally so Canvas can access it
      (window as any).__draggingElementId = element.id;

      console.log('Drag started for element:', element.id);
    }
  }

  function handleDragEnd(e: DragEvent) {
    isDragging = false;
    (window as any).__draggingElementId = null;
    console.log('Drag ended for element:', element.id);
  }

  function handleContainerDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
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
      const elementId = e.dataTransfer.getData('application/x-element-id');
      if (elementId) {
        // This is a reordering operation - let it bubble to parent
        console.log('Reordering operation detected, letting event bubble');
        return;
      }

      // Check if it's a new element from palette
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const newElement: FormElement = JSON.parse(jsonData);
          addElement(newElement, element.id);
        } catch (err) {
          console.error('Failed to parse dropped element:', err);
        }
      }
    }
  }

  // Render different element types
  function renderField(el: FormElement) {
    const defn = el.defn || {};
    const label = defn.label || el.name || 'Field';
    const inputType = defn.input_type || 'Text';
    const required = defn.required || false;

    return { label, inputType, required };
  }

  // Check if element can be a container
  const isContainer = $derived(
    element['#tag'] === 'fieldset' ||
    element['#tag'] === 'div' ||
    element['#tag'] === 'container'
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
  {#if element['#tag'] === 'af-field'}
    {@const field = renderField(element)}
    <div class="form-group">
      <label>
        {field.label}
        {#if field.required}
          <span class="crm-marker">*</span>
        {/if}
      </label>

      {#if field.inputType === 'TextArea'}
        <textarea class="form-control" rows="3" placeholder={field.label}></textarea>
      {:else if field.inputType === 'Select'}
        <select class="form-control">
          <option>- select -</option>
        </select>
      {:else if field.inputType === 'CheckBox'}
        <div class="checkbox">
          <label>
            <input type="checkbox" /> {field.label}
          </label>
        </div>
      {:else if field.inputType === 'Radio'}
        <div class="radio">
          <label>
            <input type="radio" name={element.id} /> Option 1
          </label>
        </div>
      {:else if field.inputType === 'Date'}
        <input type="text" class="form-control" placeholder="mm/dd/yyyy" />
      {:else if field.inputType === 'EntityRef'}
        <input type="text" class="form-control" placeholder="Start typing..." />
      {:else}
        <input type="text" class="form-control" placeholder={field.label} />
      {/if}
    </div>
  {:else if element['#tag'] === 'fieldset'}
    <fieldset
      class="preview-fieldset"
      class:drag-over={dragOverContainer}
      class:has-children={element['#children'] && element['#children'].length > 0}
      ondragover={handleContainerDragOver}
      ondragleave={handleContainerDragLeave}
      ondrop={handleContainerDrop}
    >
      {#if element['af-fieldset']}
        <legend>Entity: {element['af-fieldset']}</legend>
      {/if}
      <div class="fieldset-content">
        {#if element['#children'] && element['#children'].length > 0}
          {#each element['#children'] as child}
            {#if typeof child === 'object' && child['#tag'] === 'legend' && child['#children']}
              <legend>{child['#children'][0]}</legend>
            {:else if typeof child === 'object' && child['#tag']}
              <svelte:self element={child} />
            {/if}
          {/each}
        {:else}
          <div class="container-empty">Drop fields or containers here</div>
        {/if}
      </div>
    </fieldset>
  {:else if element['#tag'] === 'div' || element['#tag'] === 'container'}
    <div
      class="preview-container"
      class:drag-over={dragOverContainer}
      ondragover={handleContainerDragOver}
      ondragleave={handleContainerDragLeave}
      ondrop={handleContainerDrop}
    >
      <div class="container-label">Container</div>
      {#if element['#children'] && element['#children'].length > 0}
        {#each element['#children'] as child}
          {#if typeof child === 'object' && child['#tag']}
            <svelte:self element={child} />
          {/if}
        {/each}
      {:else}
        <div class="container-empty">Drop fields here</div>
      {/if}
    </div>
  {:else if element['#tag'] === 'button'}
    <button type="button" class="btn {element.class || 'btn-default'}">
      {#if element['#children'] && typeof element['#children'][0] === 'string'}
        {element['#children'][0]}
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
    margin: 10px 0;
    padding: 10px;
    border: 2px solid transparent;
    border-radius: 4px;
    transition: all 0.2s;
    cursor: move;
  }

  .preview-element:hover {
    background: #f9f9f9;
    border-color: #ddd;
  }

  .preview-element.selected {
    background: #e6f2ff;
    border-color: #337ab7;
    box-shadow: 0 0 0 3px rgba(51, 122, 183, 0.1);
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
    font-weight: bold;
    margin-bottom: 5px;
    color: #333;
  }

  .crm-marker {
    color: #d9534f;
  }

  .preview-fieldset {
    border: 4px solid #337ab7;
    background: linear-gradient(135deg, #e8f4f8 0%, #f0f8ff 100%);
    padding: 25px;
    margin: 15px 0;
    border-radius: 8px;
    min-height: 150px;
    position: relative;
    box-shadow: 0 2px 8px rgba(51, 122, 183, 0.15);
  }

  .preview-fieldset::before {
    content: 'DROP ZONE';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    font-weight: bold;
    color: rgba(51, 122, 183, 0.1);
    pointer-events: none;
    letter-spacing: 4px;
  }

  .preview-fieldset.has-children::before {
    display: none;
  }

  .preview-fieldset.drag-over {
    background: linear-gradient(135deg, #fff3cd 0%, #fffaeb 100%);
    border-color: #ffc107;
    border-width: 5px;
    border-style: dashed;
    box-shadow: 0 4px 16px rgba(255, 193, 7, 0.3);
  }

  .preview-fieldset.drag-over::before {
    content: 'DROP HERE';
    color: rgba(255, 193, 7, 0.3);
    font-size: 32px;
  }

  .preview-fieldset legend {
    width: auto;
    padding: 8px 20px;
    margin: -25px 0 20px -25px;
    font-size: 14px;
    font-weight: bold;
    border: none;
    background: #337ab7;
    color: white;
    border-radius: 8px 0 8px 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    position: relative;
    z-index: 1;
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
    top: 5px;
    right: 5px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .preview-element.selected .element-actions {
    opacity: 1;
  }

  .element-actions button {
    padding: 2px 6px;
    margin-left: 4px;
  }

  .element-actions .drag-handle {
    cursor: move;
  }

  .element-actions .drag-handle:hover {
    background: #e0e0e0;
  }
</style>
