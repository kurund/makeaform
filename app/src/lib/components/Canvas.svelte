<script lang="ts">
  import FormPreview from './FormPreview.svelte';
  import { store, addElement, moveElement } from '../stores/formStore.svelte';
  import type { FormElement } from '../types';

  let dragOver = $state(false);
  let dropIndex = $state<number | null>(null);
  let dropBefore = $state(false);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;

    if (e.dataTransfer) {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        try {
          const element: FormElement = JSON.parse(data);
          addElement(element);
        } catch (err) {
          console.error('Failed to parse dropped element:', err);
        }
      }
    }
  }

  function handleElementDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    // Don't stop propagation - let it bubble

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    dropBefore = e.clientY < midpoint;
    dropIndex = index;

    console.log('Drag over index:', index, 'dropBefore:', dropBefore);

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  function handleElementDragLeave(e: DragEvent) {
    // Only clear if we're actually leaving the wrapper, not just moving to a child
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      dropIndex = null;
      dropBefore = false;
    }
  }

  function handleElementDrop(e: DragEvent, targetIndex: number) {
    console.log('handleElementDrop called for index:', targetIndex);
    e.preventDefault();
    e.stopPropagation();

    const wasBefore = dropBefore;
    dropIndex = null;
    dropBefore = false;

    // Check global variable first
    const elementId = (window as any).__draggingElementId;

    if (elementId) {
      // Moving existing element
      const newIndex = wasBefore ? targetIndex : targetIndex + 1;
      console.log('Moving element', elementId, 'to index', newIndex);
      moveElement(elementId, null, newIndex);
      (window as any).__draggingElementId = null;
    } else if (e.dataTransfer) {
      // Adding new element from palette
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        try {
          const newElement: FormElement = JSON.parse(jsonData);
          console.log('Adding new element from palette');
          addElement(newElement, null);
        } catch (err) {
          console.error('Failed to parse dropped element:', err);
        }
      }
    }
  }
</script>

<div class="canvas-panel">
  <div class="canvas-header">
    <h3>Form Canvas</h3>
  </div>

  <div
    class="canvas-content"
    class:drag-over={dragOver}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    role="region"
    aria-label="Form canvas drop zone"
  >
    {#if store.formElements.length === 0}
      <div class="canvas-empty">
        <i class="fa fa-mouse-pointer fa-3x"></i>
        <p>Drag elements here to start building your form</p>
      </div>
    {:else}
      <div class="canvas-preview">
        {#each store.formElements as element, i}
          <div
            class="element-wrapper"
            class:drop-before={dropIndex === i && dropBefore}
            class:drop-after={dropIndex === i && !dropBefore}
            ondragover={(e) => handleElementDragOver(e, i)}
            ondragleave={handleElementDragLeave}
            ondrop={(e) => handleElementDrop(e, i)}
            ondragenter={(e) => e.preventDefault()}
          >
            <FormPreview {element} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .canvas-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
  }

  .canvas-header {
    padding: 15px 20px;
    background: #fff;
    border-bottom: 1px solid #ddd;
  }

  .canvas-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: bold;
  }

  .canvas-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    min-height: 300px;
    transition: background-color 0.2s;
  }

  .canvas-content.drag-over {
    background-color: #f0f8ff;
    outline: 2px dashed #337ab7;
    outline-offset: -10px;
  }

  .canvas-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
    text-align: center;
    padding: 40px;
  }

  .canvas-empty i {
    margin-bottom: 20px;
    opacity: 0.5;
  }

  .canvas-empty p {
    font-size: 16px;
    margin: 0;
  }

  .canvas-preview {
    max-width: 800px;
    margin: 0 auto;
  }

  .element-wrapper {
    position: relative;
  }

  .element-wrapper::before,
  .element-wrapper::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    background: transparent;
    transition: all 0.2s;
    z-index: 100;
  }

  .element-wrapper::before {
    top: 0;
  }

  .element-wrapper::after {
    bottom: 0;
  }

  .element-wrapper.drop-before::before {
    height: 4px;
    background: #28a745;
    box-shadow: 0 0 8px rgba(40, 167, 69, 0.6);
    top: -2px;
  }

  .element-wrapper.drop-after::after {
    height: 4px;
    background: #28a745;
    box-shadow: 0 0 8px rgba(40, 167, 69, 0.6);
    bottom: -2px;
  }
</style>
