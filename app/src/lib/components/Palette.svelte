<script lang="ts">
  import type { PaletteItem } from '../types';
  import EntitySelector from './EntitySelector.svelte';
  import { store } from '../stores/formStore.svelte';

  let searchQuery = $state('');

  const layoutItems: PaletteItem[] = [
    {
      id: 'container',
      label: 'Container',
      category: 'Layout',
      icon: 'fa-square-o',
      element: { '#tag': 'div', class: 'af-container', '#children': [] }
    },
    {
      id: 'fieldset',
      label: 'Fieldset',
      category: 'Layout',
      icon: 'fa-object-group',
      element: { '#tag': 'fieldset', '#children': [{ '#tag': 'legend', '#children': ['Fieldset Title'] }] }
    },
    {
      id: 'button',
      label: 'Submit Button',
      category: 'Actions',
      icon: 'fa-hand-pointer-o',
      element: {
        '#tag': 'button',
        class: 'af-button btn btn-primary',
        'crm-icon': 'fa-check',
        'ng-click': 'afform.submit()',
        '#children': ['{{:: ts(\'Submit\') }}']
      }
    }
  ];

  // Get list of field names already used in the form
  const usedFields = $derived(() => {
    const fields = new Set<string>();
    const collectFields = (elements: any[]): void => {
      for (const el of elements) {
        if (el['#tag'] === 'af-field' && el.name) {
          fields.add(el.name);
        }
        if (el['#children']) {
          collectFields(el['#children']);
        }
      }
    };
    collectFields(store.formElements);
    return fields;
  });

  // Show entity fields and layout elements
  const allItems = $derived(() => {
    const items = [...layoutItems];

    // Add entity fields if an entity is selected
    if (store.selectedEntity && store.entityFields) {
      const entityName = store.selectedEntity;
      const used = usedFields();

      for (const [fieldName, field] of Object.entries(store.entityFields)) {
        const fullFieldName = `${entityName}.${fieldName}`;

        // Skip if field is already used in the form
        if (used.has(fullFieldName)) {
          continue;
        }

        items.push({
          id: `field_${entityName}_${fieldName}`,
          label: field.label || field.title || fieldName,
          category: `${entityName} Fields`,
          icon: 'fa-field',
          element: {
            '#tag': 'af-field',
            name: fullFieldName,
            defn: {
              label: field.label || field.title || fieldName,
              input_type: field.input_type || 'Text',
              required: field.required || false
            }
          }
        });
      }
    }

    return items;
  });

  const filteredItems = $derived(
    searchQuery
      ? allItems().filter(item =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allItems()
  );

  const groupedItems = $derived(
    filteredItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, PaletteItem[]>)
  );

  function handleDragStart(e: DragEvent, item: PaletteItem) {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/json', JSON.stringify(item.element));
    }
  }
</script>

<div class="palette-panel">
  <div class="palette-header">
    <h3>Elements</h3>
  </div>

  <EntitySelector />

  <div class="palette-search">
    <input
      type="text"
      class="form-control input-sm"
      placeholder="Search elements..."
      bind:value={searchQuery}
      aria-label="Search elements"
    />
  </div>

  <div class="palette-content">
    {#if !store.selectedEntity}
      <div class="palette-empty">
        <i class="fa fa-arrow-up fa-2x"></i>
        <p><strong>Select an entity above</strong></p>
        <p>Choose an entity to see available fields</p>
      </div>
    {:else}
      {#each Object.entries(groupedItems) as [category, items]}
        <div class="palette-category">
          <h4>{category}</h4>
          <div class="palette-items">
            {#each items as item}
              <div
                class="palette-item"
                draggable="true"
                ondragstart={(e) => handleDragStart(e, item)}
                role="button"
                tabindex="0"
                aria-label={`Add ${item.label}`}
              >
                <i class="fa {item.icon}"></i>
                <span>{item.label}</span>
              </div>
            {/each}
          </div>
        </div>
      {/each}

      {#if Object.keys(groupedItems).length === 0}
        <div class="text-center text-muted" style="padding: 20px;">
          No elements found
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .palette-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #ffffff;
  }

  .palette-header {
    padding: 20px;
    background: #ffffff;
    border-bottom: 1px solid #e8e8eb;
  }

  .palette-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #2C2C2C;
    letter-spacing: 0.3px;
  }

  .palette-search {
    padding: 16px 20px;
    background: #ffffff;
    border-bottom: 1px solid #e8e8eb;
  }

  .palette-search input {
    border: 1px solid #e8e8eb;
    border-radius: 8px;
    padding: 8px 12px;
    transition: all 0.2s ease;
  }

  .palette-search input:focus {
    border-color: #6C5CE7;
    outline: none;
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
  }

  .palette-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: #f9f9fb;
  }

  .palette-category {
    margin-bottom: 24px;
  }

  .palette-category h4 {
    margin: 0 0 12px 0;
    font-size: 11px;
    font-weight: 700;
    color: #8B8B8B;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 0 4px;
  }

  .palette-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .palette-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: #ffffff;
    border: 1px solid #e8e8eb;
    border-radius: 8px;
    cursor: grab;
    transition: all 0.15s ease;
  }

  .palette-item:hover {
    background: #FAFAFA;
    border-color: #6C5CE7;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(108, 92, 231, 0.15);
  }

  .palette-item:active {
    cursor: grabbing;
    transform: scale(0.98);
  }

  .palette-item i {
    font-size: 18px;
    color: #6C5CE7;
    width: 24px;
    text-align: center;
  }

  .palette-item span {
    font-size: 14px;
    color: #2C2C2C;
    font-weight: 500;
  }

  .palette-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #BDBDBD;
    text-align: center;
  }

  .palette-empty i {
    margin-bottom: 16px;
    opacity: 0.4;
    color: #6C5CE7;
  }

  .palette-empty p {
    margin: 4px 0;
    font-size: 14px;
    color: #8B8B8B;
  }

  .palette-empty p strong {
    color: #4A4A4A;
    font-weight: 600;
  }
</style>
