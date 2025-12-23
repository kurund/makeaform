<script lang="ts">
  import type { FormElement } from "../types";
  import {
    store,
    selectElement,
    deleteElement,
  } from "../stores/formStore.svelte";

  let { element, level = 0 }: { element: FormElement; level?: number } =
    $props();

  let expanded = $state(true);

  const isSelected = $derived(store.selectedElementId === element.id);
  const hasChildren = $derived(
    element["#children"] && element["#children"].length > 0,
  );

  function getElementLabel(el: FormElement): string {
    if (el["#tag"] === "af-field" && el.name) {
      return `Field: ${el.name}`;
    }
    if (el["#tag"] === "fieldset" && el["#children"]) {
      const legend = el["#children"].find(
        (c: FormElement) => c["#tag"] === "legend",
      );
      if (
        legend &&
        legend["#children"] &&
        typeof legend["#children"][0] === "string"
      ) {
        return `Fieldset: ${legend["#children"][0]}`;
      }
    }
    return el["#tag"] || "Element";
  }

  function handleSelect() {
    selectElement(element.id);
  }

  function handleDelete(e: Event) {
    e.stopPropagation();
    if (confirm("Delete this element?")) {
      deleteElement(element.id);
    }
  }

  function toggleExpanded() {
    expanded = !expanded;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect();
    }
  }
</script>

<div class="canvas-element" style="padding-left: {level * 20}px">
  <div
    class="element-header"
    class:selected={isSelected}
    onclick={handleSelect}
    onkeydown={handleKeydown}
    role="button"
    tabindex="0"
    aria-label={`Select ${getElementLabel(element)}`}
  >
    <div class="element-left">
      {#if hasChildren}
        <button
          type="button"
          class="btn-expand"
          onclick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <i class="fa fa-{expanded ? 'caret-down' : 'caret-right'}"></i>
        </button>
      {:else}
        <span class="btn-expand-placeholder"></span>
      {/if}

      <i class="fa fa-cube element-icon"></i>
      <span class="element-label">{getElementLabel(element)}</span>
    </div>

    <div class="element-actions">
      <button
        type="button"
        class="btn btn-xs btn-danger"
        onclick={handleDelete}
        aria-label="Delete element"
      >
        <i class="fa fa-trash"></i>
      </button>
    </div>
  </div>

  {#if hasChildren && expanded}
    <div class="element-children">
      {#each element["#children"] as child}
        {#if typeof child === "object" && child["#tag"]}
          <svelte:self element={child} level={level + 1} />
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .canvas-element {
    margin: 2px 0;
  }

  .element-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .element-header:hover {
    background: #f0f0f0;
    border-color: #999;
  }

  .element-header.selected {
    background: #e6f2ff;
    border-color: #337ab7;
    box-shadow: 0 0 0 2px rgba(51, 122, 183, 0.2);
  }

  .element-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .btn-expand {
    background: none;
    border: none;
    padding: 0;
    width: 16px;
    height: 16px;
    cursor: pointer;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-expand:hover {
    color: #333;
  }

  .btn-expand-placeholder {
    display: inline-block;
    width: 16px;
  }

  .element-icon {
    color: #337ab7;
    font-size: 14px;
  }

  .element-label {
    font-size: 14px;
    color: #333;
  }

  .element-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .element-header:hover .element-actions {
    opacity: 1;
  }

  .element-children {
    margin-top: 4px;
  }
</style>
