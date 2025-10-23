<script lang="ts">
  import { store, updateElement } from '../stores/formStore.svelte';

  function updateProperty(key: string, value: any) {
    if (store.selectedElement && store.selectedElement.id) {
      updateElement(store.selectedElement.id, { [key]: value });
    }
  }
</script>

<div class="properties-panel">
  <div class="properties-header">
    <h3>Properties</h3>
  </div>

  <div class="properties-content">
    {#if store.selectedElement}
      {#if store.selectedElement['#tag'] === 'af-field'}
        <div class="form-group">
          <label>Field</label>
          <div class="field-info">
            <i class="fa fa-cube"></i>
            <strong>{store.selectedElement.name || 'Unnamed field'}</strong>
          </div>
        </div>

        {#if store.selectedElement.defn}
          <div class="form-group">
            <label for="field-label">Label</label>
            <input
              id="field-label"
              type="text"
              class="form-control"
              value={store.selectedElement.defn.label || ''}
              oninput={(e) => updateProperty('defn', { ...store.selectedElement.defn, label: e.currentTarget.value })}
              placeholder="Contact"
            />
          </div>

          <div class="form-group">
            <label for="input-type">Input Type</label>
            <select
              id="input-type"
              class="form-control"
              value={store.selectedElement.defn.input_type || 'Text'}
              onchange={(e) => updateProperty('defn', { ...store.selectedElement.defn, input_type: e.currentTarget.value })}
            >
              <option value="Text">Text</option>
              <option value="TextArea">Textarea</option>
              <option value="Select">Select</option>
              <option value="CheckBox">Checkbox</option>
              <option value="Radio">Radio</option>
              <option value="Date">Date</option>
              <option value="EntityRef">Entity Reference</option>
            </select>
          </div>

          <div class="form-group">
            <label>
              <input
                type="checkbox"
                checked={store.selectedElement.defn.required || false}
                onchange={(e) => updateProperty('defn', { ...store.selectedElement.defn, required: e.currentTarget.checked })}
              />
              Required
            </label>
          </div>
        {/if}
      {:else if store.selectedElement['#tag'] === 'button'}
        <div class="form-group">
          <label for="button-text">Button Text</label>
          <input
            id="button-text"
            type="text"
            class="form-control"
            value={store.selectedElement['#children'] && typeof store.selectedElement['#children'][0] === 'string' ? store.selectedElement['#children'][0] : ''}
            oninput={(e) => updateProperty('#children', [e.currentTarget.value])}
            placeholder="Submit"
          />
        </div>

        <div class="form-group">
          <label for="button-style">Button Style</label>
          <select
            id="button-style"
            class="form-control"
            value={store.selectedElement.class || 'btn-primary'}
            onchange={(e) => updateProperty('class', e.currentTarget.value)}
          >
            <option value="btn btn-primary">Primary (Blue)</option>
            <option value="btn btn-success">Success (Green)</option>
            <option value="btn btn-info">Info (Light Blue)</option>
            <option value="btn btn-warning">Warning (Orange)</option>
            <option value="btn btn-danger">Danger (Red)</option>
            <option value="btn btn-default">Default (Gray)</option>
          </select>
        </div>
      {:else if store.selectedElement['#tag'] === 'fieldset'}
        <div class="form-group">
          <label for="fieldset-legend">Legend Text</label>
          <input
            id="fieldset-legend"
            type="text"
            class="form-control"
            value={store.selectedElement['#children']?.find((c: any) => c['#tag'] === 'legend')?.['#children']?.[0] || ''}
            oninput={(e) => {
              const legend = store.selectedElement['#children']?.find((c: any) => c['#tag'] === 'legend');
              if (legend) {
                legend['#children'] = [e.currentTarget.value];
              }
            }}
            placeholder="Fieldset Title"
          />
        </div>
      {:else if store.selectedElement['#tag'] === 'div'}
        <div class="form-group">
          <label>Container</label>
          <p class="help-block">This is a container for grouping fields. Drag fields into it to organize your form.</p>
        </div>
      {/if}
    {:else}
      <div class="properties-empty">
        <i class="fa fa-hand-pointer-o fa-3x"></i>
        <p>Select an element to view and edit its properties</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .properties-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f5f5f5;
    border-left: 1px solid #ddd;
  }

  .properties-header {
    padding: 15px;
    background: #fff;
    border-bottom: 1px solid #ddd;
  }

  .properties-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: bold;
  }

  .properties-content {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
  }

  .properties-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
    text-align: center;
    padding: 40px 20px;
  }

  .properties-empty i {
    margin-bottom: 20px;
    opacity: 0.5;
  }

  .properties-empty p {
    font-size: 14px;
    margin: 0;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    font-size: 13px;
    color: #333;
  }

  .form-group label input[type="checkbox"] {
    margin-right: 5px;
  }

  .help-block {
    display: block;
    margin-top: 5px;
    color: #737373;
    font-size: 12px;
  }

  .field-info {
    padding: 10px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .field-info i {
    color: #337ab7;
  }

  .field-info strong {
    color: #333;
    word-break: break-all;
  }
</style>
