<script lang="ts">
  import EntitySelector from "./EntitySelector.svelte";
  import {
    store,
    gotoField,
    addElement,
    setJoinEntityFields,
    getJoinEntityFields,
    switchToPage,
  } from "../stores/formStore.svelte";
  import { getEntityFields } from "../api/civicrm";
  import type { JoinEntity } from "../types";

  let searchQuery = $state("");
  let expandedJoins = $state<Set<string>>(new Set()); // Track which join sections are expanded
  let availableFieldsCollapsed = $state(false);
  let addJoinCollapsed = $state(false);

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

  // Filter available fields by search query
  const filteredFields = $derived(() => {
    const fields = availableFields();
    if (!searchQuery.trim()) return fields;

    const query = searchQuery.toLowerCase().trim();
    return fields.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query),
    );
  });

  // Get available join entities for the current entity type
  const availableJoins = $derived(() => {
    if (!store.selectedEntity || !store.adminData?.entities) return [];
    const entity = store.adminData.entities[store.selectedEntity];
    return entity?.joins || [];
  });

  // Get joins already added to the current page
  const addedJoins = $derived(() => {
    if (!store.currentPage || !store.currentPage["#children"]) return [];
    return store.currentPage["#children"]
      .filter((child: any) => child["af-join"])
      .map((child: any) => child["af-join"]);
  });

  // Look up join entity icon by name
  function getJoinIcon(joinName: string): string {
    const join = availableJoins().find((j: JoinEntity) => j.name === joinName);
    return join?.icon || "fa-link";
  }

  // Get available (not yet added) join entities
  const availableJoinEntities = $derived(() => {
    const added = new Set(addedJoins());
    return availableJoins().filter((join: JoinEntity) => !added.has(join.name));
  });

  // Get fields used in a specific join
  function getUsedJoinFields(joinName: string): Set<string> {
    const fields = new Set<string>();
    if (!store.currentPage || !store.currentPage["#children"]) return fields;

    const joinElement = store.currentPage["#children"].find(
      (child: any) => child["af-join"] === joinName,
    );

    if (joinElement && joinElement["#children"]) {
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
      collectFields(joinElement["#children"]);
    }

    return fields;
  }

  // Get available fields for a join entity
  function getAvailableJoinFields(joinName: string) {
    const joinFields = getJoinEntityFields(joinName);
    const usedFields = getUsedJoinFields(joinName);

    return Object.entries(joinFields)
      .filter(([fieldName]) => !usedFields.has(fieldName))
      .map(([fieldName, field]: [string, any]) => ({
        name: fieldName,
        label: field.label || field.title || fieldName,
        field: field,
      }));
  }

  function handlePageClick(pageIndex: number) {
    switchToPage(pageIndex);
  }

  function handleAddField(fieldName: string, field: any) {
    if (!store.currentPage) return;

    // Build default defn from entity field metadata
    const defaultDefn: Record<string, any> = {
      label: field.label || field.title || fieldName,
      input_type: field.input_type || "Text",
      required: field.required || false,
      placeholder: "",
      help_post: field.help_pre || field.help_post || "",
    };

    // Include options for Select, Radio, CheckBox fields
    if (
      field.options &&
      Array.isArray(field.options) &&
      field.options.length > 0
    ) {
      defaultDefn.options = field.options;
    }

    const newQuestion = {
      "#tag": "af-field" as const,
      name: fieldName,
      defn: { ...defaultDefn },
      // Store original defaults for comparison during save
      originalDefn: { ...defaultDefn },
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    addElement(newQuestion, store.currentPage.id);

    // Navigate to the new field
    const newFieldIndex = store.currentPageFields.length - 1;
    gotoField(store.currentPageIndex, newFieldIndex);
  }

  // Add a join entity to the current page
  async function handleAddJoin(join: JoinEntity) {
    if (!store.currentPage) return;

    // Create the join element structure
    const joinElement = {
      "#tag": "div" as const,
      "af-join": join.name,
      id: `join_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actions: { update: true, delete: true },
      "#children": [] as any[],
    };

    // Add the join element to the current page
    addElement(joinElement, store.currentPage.id);

    // Load fields for this join entity
    try {
      const fields = await getEntityFields(join.name);
      setJoinEntityFields(join.name, fields);
    } catch (error) {
      console.error(`Failed to load fields for ${join.name}:`, error);
    }

    // Collapse other sections so the new join is immediately visible
    availableFieldsCollapsed = true;
    addJoinCollapsed = true;

    // Expand this join section
    expandedJoins = new Set([join.name]);
  }

  // Remove a join entity from the current page
  function handleRemoveJoin(joinName: string) {
    if (!store.currentPage || !store.currentPage["#children"]) return;

    const joinElement = store.currentPage["#children"].find(
      (child: any) => child["af-join"] === joinName,
    );

    if (joinElement && joinElement.id) {
      const fieldCount = getUsedJoinFields(joinName).size;
      const message =
        fieldCount > 0
          ? `Remove "${joinName}" and its ${fieldCount} field${fieldCount > 1 ? "s" : ""}?`
          : `Remove "${joinName}"?`;

      if (confirm(message)) {
        // Remove from store
        const index = store.currentPage["#children"].indexOf(joinElement);
        if (index > -1) {
          store.currentPage["#children"].splice(index, 1);
          store.hasUnsavedChanges = true;
        }

        // Collapse the section
        expandedJoins.delete(joinName);
        expandedJoins = new Set(expandedJoins);
      }
    }
  }

  // Toggle join section expansion
  function toggleJoinExpansion(joinName: string) {
    if (expandedJoins.has(joinName)) {
      expandedJoins.delete(joinName);
    } else {
      expandedJoins.add(joinName);
    }
    expandedJoins = new Set(expandedJoins);
  }

  // Add a field to a join entity
  function handleAddJoinField(joinName: string, fieldName: string, field: any) {
    if (!store.currentPage || !store.currentPage["#children"]) return;

    const joinElement = store.currentPage["#children"].find(
      (child: any) => child["af-join"] === joinName,
    );

    if (!joinElement) return;

    // Build default defn from field metadata
    const defaultDefn: Record<string, any> = {
      label: field.label || field.title || fieldName,
      input_type: field.input_type || "Text",
      required: field.required || false,
      placeholder: "",
      help_post: field.help_pre || field.help_post || "",
    };

    // Include options for Select, Radio, CheckBox fields
    if (
      field.options &&
      Array.isArray(field.options) &&
      field.options.length > 0
    ) {
      defaultDefn.options = field.options;
    }

    const newField = {
      "#tag": "af-field" as const,
      name: fieldName,
      defn: { ...defaultDefn },
      originalDefn: { ...defaultDefn },
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Add field directly to join element's children
    if (!joinElement["#children"]) {
      joinElement["#children"] = [];
    }
    joinElement["#children"].push(newField);
    store.hasUnsavedChanges = true;
  }
</script>

<div class="question-navigator">
  <EntitySelector />

  <div class="navigator-content">
    {#if !store.selectedEntity}
      <div class="navigator-empty">
        <i class="crm-i fa-hand-pointer-o fa-2x"></i>
        <p><strong>Pick an entity above</strong></p>
        <p>to start building your form</p>
      </div>
    {:else if store.pages.length === 0}
      <div class="navigator-empty">
        <i class="crm-i fa-inbox fa-2x"></i>
        <p><strong>No fields yet</strong></p>
        <p>Select an entity and add fields to build your form</p>
      </div>
    {:else}
      <div class="pages-list">
        {#each store.pages as page, pageIndex}
          {@const questions =
            page["#children"]?.filter((q) => q["#tag"] === "af-field") || []}
          {@const pageName =
            page.label || page["af-fieldset"] || `Page ${pageIndex + 1}`}

          <div class="page-item">
            <div
              class="page-header"
              class:active={store.currentPageIndex === pageIndex}
              onclick={() => handlePageClick(pageIndex)}
              role="button"
              tabindex="0"
            >
              <i class="crm-i fa-file-text-o"></i>
              <span class="page-name">{pageName}</span>
              <span class="question-count">{questions.length}</span>
            </div>
          </div>
        {/each}
      </div>

      {#if store.currentPage}
        <div class="available-fields">
          <button
            type="button"
            class="available-fields-header"
            onclick={() =>
              (availableFieldsCollapsed = !availableFieldsCollapsed)}
          >
            <i
              class="crm-i {availableFieldsCollapsed
                ? 'fa-chevron-right'
                : 'fa-chevron-down'} section-chevron"
            ></i>
            <h4>Available Fields</h4>
            <span class="field-count">{availableFields().length}</span>
          </button>

          {#if !availableFieldsCollapsed}
            {#if availableFields().length > 0}
              <div class="field-search">
                <i class="crm-i fa-search"></i>
                <input
                  type="text"
                  placeholder=" Search fields..."
                  bind:value={searchQuery}
                />
                {#if searchQuery}
                  <button
                    type="button"
                    class="clear-search"
                    onclick={() => (searchQuery = "")}
                    title="Clear search"
                  >
                    <i class="crm-i fa-times"></i>
                  </button>
                {/if}
              </div>
            {/if}

            {#if availableFields().length === 0}
              <div class="no-fields">
                <i class="crm-i fa-check-circle"></i>
                <p>All fields added!</p>
              </div>
            {:else if filteredFields().length === 0}
              <div class="no-fields">
                <i class="crm-i fa-search"></i>
                <p>No matching fields</p>
              </div>
            {:else}
              <div class="fields-list">
                {#each filteredFields() as item}
                  <button
                    type="button"
                    class="field-item"
                    onclick={() => handleAddField(item.name, item.field)}
                  >
                    <i class="crm-i fa-plus-circle field-icon"></i>
                    <span>{item.label}</span>
                  </button>
                {/each}
              </div>
            {/if}
          {/if}
        </div>

        <!-- Add Related Entity Section -->
        {#if availableJoinEntities().length > 0}
          <div class="add-join-section">
            <button
              type="button"
              class="add-join-header"
              onclick={() => (addJoinCollapsed = !addJoinCollapsed)}
            >
              <i
                class="crm-i {addJoinCollapsed
                  ? 'fa-chevron-right'
                  : 'fa-chevron-down'} section-chevron"
              ></i>
              <h4>Add Related Entity</h4>
            </button>
            {#if !addJoinCollapsed}
              <div class="join-list">
                {#each availableJoinEntities() as join}
                  <button
                    type="button"
                    class="join-item"
                    onclick={() => handleAddJoin(join)}
                  >
                    <i class="crm-i {join.icon || 'fa-link'}"></i>
                    <span>{join.label}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Added Join Sections -->
        {#each addedJoins() as joinName}
          {@const joinFields = getAvailableJoinFields(joinName)}
          {@const usedCount = getUsedJoinFields(joinName).size}
          {@const isExpanded = expandedJoins.has(joinName)}

          <div class="join-section">
            <div class="join-section-header">
              <button
                type="button"
                class="join-toggle"
                onclick={() => toggleJoinExpansion(joinName)}
              >
                <i
                  class="crm-i {isExpanded
                    ? 'fa-chevron-down'
                    : 'fa-chevron-right'}"
                ></i>
                <i class="crm-i {getJoinIcon(joinName)} join-icon"></i>
                <span class="join-name">{joinName}</span>
                <span class="join-field-count">{usedCount}</span>
              </button>
              <button
                type="button"
                class="join-remove"
                onclick={() => handleRemoveJoin(joinName)}
                title="Remove {joinName}"
              >
                <i class="crm-i fa-times"></i>
              </button>
            </div>

            {#if isExpanded}
              <div class="join-fields">
                {#if joinFields.length === 0}
                  <div class="no-join-fields">
                    <i class="crm-i fa-check-circle"></i>
                    <span>All fields added</span>
                  </div>
                {:else}
                  {#each joinFields as item}
                    <button
                      type="button"
                      class="field-item"
                      onclick={() =>
                        handleAddJoinField(joinName, item.name, item.field)}
                    >
                      <i class="crm-i fa-plus-circle"></i>
                      <span>{item.label}</span>
                    </button>
                  {/each}
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    {/if}
  </div>
</div>

<style>
  .question-navigator {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--crm-paper);
  }

  .navigator-header {
    padding: var(--crm-l-medium-2) var(--crm-l-reg);
    background: var(--crm-paper);
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .navigator-header h3 {
    margin: 0;
    font-size: var(--crm-font-size);
    font-weight: 700;
    color: var(--crm-text-color);
    letter-spacing: 0.3px;
  }

  .navigator-content {
    flex: 1;
    overflow-y: auto;
    background: var(--crm-layer1-bg-color);
  }

  .navigator-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--crm-l-large-1) var(--crm-l-reg-2);
    color: var(--crm-c-gray-400);
    text-align: center;
  }

  .navigator-empty :global(i) {
    margin-bottom: var(--crm-l-reg);
    opacity: 0.4;
    color: var(--makeaform-accent);
  }

  .navigator-empty p {
    margin: var(--crm-l-xsmall-1) 0;
    font-size: var(--crm-l-medium-3);
    color: var(--crm-c-gray-600);
  }

  .navigator-empty p strong {
    color: var(--crm-c-gray-800);
    font-weight: 600;
  }

  .pages-list {
    padding: var(--crm-l-medium-2);
  }

  .page-item {
    margin-bottom: var(--crm-l-medium-2);
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-medium-1) var(--crm-l-medium-2);
    background: var(--crm-paper);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--makeaform-radius);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .page-header:hover {
    border-color: var(--makeaform-accent);
    background: var(--crm-layer1-bg-color);
  }

  .page-header.active {
    background: var(--makeaform-accent-bg);
    border-color: var(--makeaform-accent);
    border-left: 3px solid var(--makeaform-accent);
  }

  .page-header :global(i) {
    color: var(--makeaform-accent);
    font-size: var(--crm-font-size);
  }

  .page-name {
    flex: 1;
    font-size: var(--crm-l-medium-3);
    font-weight: 600;
    color: var(--crm-text-color);
  }

  .question-count {
    font-size: var(--crm-font-small-size);
    font-weight: 700;
    color: var(--crm-c-gray-600);
    background: var(--crm-c-gray-100);
    padding: 2px var(--crm-l-medium);
    border-radius: var(--crm-l-medium-1);
  }

  .page-header.active .question-count {
    background: var(--makeaform-accent);
    color: var(--crm-text-light-color);
  }

  .available-fields {
    background: var(--crm-paper);
    border-top: 1px solid var(--crm-c-gray-200);
    max-height: 400px;
    overflow-y: auto;
  }

  .available-fields-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-medium-2) var(--crm-l-reg);
    border: none;
    border-bottom: 1px solid var(--crm-c-gray-200);
    background: var(--crm-layer1-bg-color);
    cursor: pointer;
    text-align: left;
  }

  .available-fields-header:hover {
    background: var(--crm-c-gray-100);
  }

  .section-chevron {
    color: var(--crm-c-gray-500);
    font-size: var(--crm-font-small-size);
    width: 12px;
  }

  .available-fields-header h4 {
    flex: 1;
    margin: 0;
    font-size: var(--crm-font-small-size);
    font-weight: 700;
    color: var(--crm-c-gray-800);
    text-transform: none;
    letter-spacing: 0;
  }

  .field-count {
    font-size: var(--crm-font-small-size);
    font-weight: 700;
    color: var(--crm-c-gray-600);
    background: var(--crm-c-gray-200);
    padding: 2px var(--crm-l-medium);
    border-radius: var(--crm-l-medium-1);
  }

  .field-search {
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-medium-1) var(--crm-l-medium-2);
    background: var(--crm-paper);
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .field-search :global(i) {
    color: var(--crm-c-gray-400);
    font-size: var(--crm-l-medium-3);
  }

  .field-search input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: var(--crm-l-medium-3);
    color: var(--crm-text-color);
    outline: none;
    padding: var(--crm-l-small) 0;
  }

  .field-search input::placeholder {
    color: var(--crm-c-gray-400);
  }

  .clear-search {
    background: none;
    border: none;
    padding: var(--crm-l-small);
    cursor: pointer;
    color: var(--crm-c-gray-400);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-search:hover {
    color: var(--crm-c-gray-600);
  }

  .no-fields {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--crm-l-large-2) var(--crm-l-reg-2);
    color: var(--crm-c-gray-600);
    text-align: center;
  }

  .no-fields :global(i) {
    font-size: var(--crm-l-large);
    color: var(--makeaform-accent);
    margin-bottom: var(--crm-l-medium-2);
    opacity: 0.6;
  }

  .no-fields p {
    margin: 0;
    font-size: var(--crm-l-medium-3);
    font-weight: 500;
  }

  .fields-list {
    padding: var(--crm-l-medium);
  }

  .field-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-medium-1) var(--crm-l-medium-2);
    background: var(--crm-paper);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-l-radius);
    cursor: pointer;
    transition: all 0.15s ease;
    margin-bottom: var(--crm-l-small);
    text-align: left;
  }

  .field-item:hover {
    background: var(--makeaform-accent-bg);
    border-color: var(--makeaform-accent);
  }

  .field-item :global(i) {
    color: var(--makeaform-accent) !important;
    font-size: var(--crm-l-medium-3);
    opacity: 0.6;
    transition: opacity 0.15s ease;
  }

  .field-item:hover :global(i) {
    opacity: 1;
  }

  .field-item span {
    font-size: var(--crm-l-medium-3);
    color: var(--crm-text-color);
    font-weight: 500;
  }

  /* Add Related Entity Section */
  .add-join-section {
    background: var(--crm-paper);
    border-top: 1px solid var(--crm-c-gray-200);
  }

  .add-join-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-medium-2) var(--crm-l-reg);
    border: none;
    border-bottom: 1px solid var(--crm-c-gray-200);
    background: var(--crm-layer1-bg-color);
    cursor: pointer;
    text-align: left;
  }

  .add-join-header:hover {
    background: var(--crm-c-gray-100);
  }

  .add-join-header h4 {
    margin: 0;
    font-size: var(--crm-font-small-size);
    font-weight: 700;
    color: var(--crm-c-gray-800);
    text-transform: none;
    letter-spacing: 0;
  }

  .join-list {
    padding: var(--crm-l-medium);
  }

  .join-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-medium-1) var(--crm-l-medium-2);
    background: var(--crm-paper);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--crm-l-radius);
    cursor: pointer;
    transition: all 0.15s ease;
    margin-bottom: var(--crm-l-small);
    text-align: left;
  }

  .join-item:hover {
    background: color-mix(
      in srgb,
      var(--crm-success-color) 10%,
      transparent 90%
    );
    border-color: var(--crm-success-color);
  }

  .join-item :global(i) {
    color: var(--crm-success-color);
    font-size: var(--crm-l-medium-3);
  }

  .join-item span {
    font-size: var(--crm-l-medium-3);
    color: var(--crm-text-color);
    font-weight: 500;
  }

  /* Added Join Sections */
  .join-section {
    background: var(--crm-paper);
    border-top: 1px solid var(--crm-c-gray-200);
  }

  .join-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--crm-l-medium-1) var(--crm-l-medium-2);
    background: color-mix(
      in srgb,
      var(--crm-success-color) 8%,
      var(--crm-layer1-bg-color) 92%
    );
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .join-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--crm-l-small) 0;
    text-align: left;
  }

  .join-toggle :global(i) {
    color: var(--crm-c-gray-500);
    font-size: var(--crm-font-small-size);
    width: 12px;
  }

  .join-icon {
    color: var(--crm-success-color);
    font-size: var(--crm-font-small-size);
  }

  .join-name {
    font-size: var(--crm-l-medium-3);
    font-weight: 600;
    color: var(--crm-text-color);
  }

  .join-field-count {
    font-size: var(--crm-font-small-size);
    font-weight: 700;
    color: var(--crm-c-gray-600);
    background: var(--crm-c-gray-200);
    padding: 1px var(--crm-l-medium);
    border-radius: var(--crm-l-medium-1);
    margin-left: var(--crm-l-medium-1);
  }

  .join-remove {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--crm-l-small);
    color: var(--crm-c-gray-400);
    transition: color 0.15s ease;
  }

  .join-remove:hover {
    color: var(--crm-danger-color);
  }

  .join-fields {
    padding: var(--crm-l-medium);
    background: var(--crm-paper);
  }

  .no-join-fields {
    display: flex;
    align-items: center;
    gap: var(--crm-l-medium-1);
    padding: var(--crm-l-medium-1);
    color: var(--crm-c-gray-500);
    font-size: var(--crm-font-small-size);
  }

  .no-join-fields :global(i) {
    color: var(--crm-success-color);
  }
</style>
