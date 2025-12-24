<script lang="ts">
  import {
    store,
    updateElement,
    deleteElement,
    gotoField,
  } from "../stores/formStore.svelte";

  const fieldTypes = [
    { value: "Text", label: "Short Text", icon: "fa-font" },
    { value: "TextArea", label: "Long Text", icon: "fa-align-left" },
    { value: "Number", label: "Number", icon: "fa-hashtag" },
    { value: "Email", label: "Email", icon: "fa-envelope" },
    { value: "Date", label: "Date", icon: "fa-calendar" },
    { value: "Select", label: "Dropdown", icon: "fa-caret-down" },
    { value: "Radio", label: "Multiple Choice", icon: "fa-dot-circle-o" },
    { value: "CheckBox", label: "Checkboxes", icon: "fa-check-square-o" },
    { value: "EntityRef", label: "Entity Reference", icon: "fa-link" },
  ];

  function handleFieldChange(field: string, value: any) {
    if (!store.currentField) return;

    if (field.startsWith("defn.")) {
      const defnField = field.replace("defn.", "");
      updateElement(store.currentField.id, {
        defn: {
          ...store.currentField.defn,
          [defnField]: value,
        },
      });
    } else {
      updateElement(store.currentField.id, {
        [field]: value,
      });
    }
  }

  function handleDeleteField() {
    if (!store.currentField) return;

    if (confirm("Delete this field?")) {
      const fieldId = store.currentField.id;
      const currentIndex = store.currentFieldIndex;
      const pageIndex = store.currentPageIndex;

      deleteElement(fieldId);

      // Navigate to previous field or stay on first
      if (currentIndex > 0) {
        gotoField(pageIndex, currentIndex - 1);
      } else {
        gotoField(pageIndex, 0);
      }
    }
  }
</script>

<div class="question-settings">
  <div class="settings-header">
    <h3>
      {store.selectedElement?.["#tag"] === "button"
        ? "Button Settings"
        : "Field Settings"}
    </h3>
  </div>

  {#if !store.selectedElement}
    <div class="settings-empty">
      <i class="fa fa-cog fa-2x"></i>
      <p>Select a field or button to edit its settings</p>
    </div>
  {:else if store.selectedElement?.["#tag"] === "button"}
    <div class="settings-content">
      <!-- Button Label -->
      <div class="form-group">
        <label for="button-label">
          <i class="fa fa-pencil"></i>
          Button Text
        </label>
        <input
          id="button-label"
          type="text"
          class="form-control"
          value={store.selectedElement?.["#children"]?.[0] || ""}
          oninput={(e) =>
            updateElement(store.selectedElement.id, {
              "#children": [(e.target as HTMLInputElement).value],
            })}
          placeholder="Submit"
        />
      </div>

      <!-- Button Icon -->
      <div class="form-group">
        <label for="button-icon">
          <i class="fa fa-picture-o"></i>
          Icon
        </label>
        <input
          id="button-icon"
          type="text"
          class="form-control"
          value={store.selectedElement?.["crm-icon"] || ""}
          oninput={(e) =>
            updateElement(store.selectedElement.id, {
              "crm-icon": (e.target as HTMLInputElement).value,
            })}
          placeholder="fa-check"
        />
        <small class="help-block"
          >FontAwesome icon class (e.g., fa-check, fa-paper-plane)</small
        >
      </div>

      <!-- Button Style -->
      <div class="form-group">
        <label for="button-class">
          <i class="fa fa-paint-brush"></i>
          Button Style
        </label>
        <select
          id="button-class"
          class="form-control"
          value={store.selectedElement?.["class"]?.includes("btn-primary")
            ? "btn-primary"
            : store.selectedElement?.["class"]?.includes("btn-success")
              ? "btn-success"
              : store.selectedElement?.["class"]?.includes("btn-danger")
                ? "btn-danger"
                : store.selectedElement?.["class"]?.includes("btn-secondary")
                  ? "btn-secondary"
                  : "btn-primary"}
          onchange={(e) => {
            const value = (e.target as HTMLSelectElement).value;
            updateElement(store.selectedElement.id, {
              class: `af-button btn ${value}`,
            });
          }}
        >
          <option value="btn-primary">Primary (Blue)</option>
          <option value="btn-success">Success (Green)</option>
          <option value="btn-danger">Danger (Red)</option>
          <option value="btn-secondary">Secondary (Gray)</option>
        </select>
      </div>

      <!-- Info Note -->
      <div class="field-info-box">
        <div class="info-row">
          <i class="fa fa-info-circle" style="margin-right: var(--crm-m);"></i>
          <span
            style="font-size: var(--crm-small-font-size); color: var(--crm-c-gray-600);"
          >
            The button will automatically submit the form when clicked.
          </span>
        </div>
      </div>
    </div>
  {:else if store.currentField}
    <div class="settings-content">
      <!-- Field Label -->
      <div class="form-group">
        <label for="field-label">
          <i class="fa fa-pencil"></i>
          Field Label
        </label>
        <input
          id="field-label"
          type="text"
          class="form-control"
          value={store.currentField.defn?.label || ""}
          oninput={(e) =>
            handleFieldChange(
              "defn.label",
              (e.target as HTMLInputElement).value,
            )}
          placeholder="Enter field label..."
        />
      </div>

      <!-- Field Type -->
      <div class="form-group">
        <label for="field-type">
          <i class="fa fa-list"></i>
          Input Type
        </label>
        <select
          id="field-type"
          class="form-control"
          value={store.currentField.defn?.input_type || "Text"}
          onchange={(e) =>
            handleFieldChange(
              "defn.input_type",
              (e.target as HTMLSelectElement).value,
            )}
        >
          {#each fieldTypes as type}
            <option value={type.value}>
              {type.label}
            </option>
          {/each}
        </select>
      </div>

      <!-- Placeholder -->
      <div class="form-group">
        <label for="placeholder">
          <i class="fa fa-text-width"></i>
          Placeholder
        </label>
        <input
          id="placeholder"
          type="text"
          class="form-control"
          value={store.currentField.defn?.placeholder || ""}
          oninput={(e) =>
            handleFieldChange(
              "defn.placeholder",
              (e.target as HTMLInputElement).value,
            )}
          placeholder="Placeholder text..."
        />
      </div>

      <!-- Help Text -->
      <div class="form-group">
        <label for="help-text">
          <i class="fa fa-info-circle"></i>
          Help Text
        </label>
        <textarea
          id="help-text"
          class="form-control"
          rows="2"
          value={store.currentField.defn?.help_post || ""}
          oninput={(e) =>
            handleFieldChange(
              "defn.help_post",
              (e.target as HTMLTextAreaElement).value,
            )}
          placeholder="Optional hint or description..."
        ></textarea>
      </div>

      <!-- Required Toggle -->
      <div class="form-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={store.currentField.defn?.required || false}
            onchange={(e) =>
              handleFieldChange(
                "defn.required",
                (e.target as HTMLInputElement).checked,
              )}
          />
          <span>
            <i class="fa fa-asterisk"></i>
            Required Field
          </span>
        </label>
      </div>

      <!-- Validation (if applicable) -->
      {#if ["Email", "Number"].includes(store.currentField.defn?.input_type || "")}
        <div class="form-group">
          <label for="validation">
            <i class="fa fa-check-circle"></i>
            Validation
          </label>
          <input
            id="validation"
            type="text"
            class="form-control"
            value={store.currentField.defn?.validation || ""}
            oninput={(e) =>
              handleFieldChange(
                "defn.validation",
                (e.target as HTMLInputElement).value,
              )}
            placeholder="Validation rules..."
          />
        </div>
      {/if}

      <!-- Field Info -->
      <div class="field-info-box">
        <div class="info-row">
          <span class="info-label">Entity:</span>
          <span class="info-value">{store.selectedEntity || "None"}</span>
        </div>
      </div>

      <!-- Delete Field -->
      <div class="delete-section">
        <button
          type="button"
          class="btn-delete-field"
          onclick={handleDeleteField}
        >
          <i class="fa fa-trash"></i>
          Delete Field
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .question-settings {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--crm-c-layer0-bg);
  }

  .settings-header {
    padding: var(--crm-r2);
    background: var(--crm-c-layer0-bg);
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .settings-header h3 {
    margin: 0;
    font-size: var(--crm-font-size);
    font-weight: 700;
    color: var(--crm-c-text);
    letter-spacing: 0.3px;
  }

  .settings-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--crm-xl) var(--crm-r2);
    color: var(--crm-c-gray-400);
    text-align: center;
  }

  .settings-empty i {
    margin-bottom: var(--crm-r);
    opacity: 0.4;
    color: var(--makeaform-accent);
  }

  .settings-empty p {
    margin: 0;
    font-size: var(--crm-m3);
    color: var(--crm-c-gray-600);
  }

  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--crm-r2);
  }

  .form-group {
    margin-bottom: var(--crm-r4);
  }

  .form-group label {
    display: flex;
    align-items: center;
    gap: var(--crm-m);
    font-size: var(--crm-small-font-size);
    font-weight: 700;
    color: var(--crm-c-gray-800);
    margin-bottom: var(--crm-m);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .form-group label i {
    color: var(--makeaform-accent);
    font-size: var(--crm-small-font-size);
  }

  .form-control {
    width: 100%;
    border: 1px solid var(--crm-input-border-color);
    border-radius: var(--makeaform-radius);
    padding: var(--crm-m1) var(--crm-m2);
    font-size: var(--crm-m3);
    color: var(--crm-input-color);
    background: var(--crm-input-bg);
    transition: all 0.2s ease;
  }

  .form-control:focus {
    outline: none;
    border-color: var(--makeaform-accent);
    box-shadow: 0 0 0 3px var(--makeaform-accent-bg);
  }

  textarea.form-control {
    resize: vertical;
    font-family: inherit;
  }

  .help-block {
    display: block;
    margin-top: var(--crm-s);
    font-size: var(--crm-small-font-size);
    color: var(--crm-c-gray-600);
    font-style: italic;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--crm-m2);
    padding: var(--crm-m2);
    background: var(--crm-c-layer1-bg);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--makeaform-radius);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .checkbox-label:hover {
    background: var(--makeaform-accent-bg);
    border-color: var(--makeaform-accent);
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .checkbox-label span {
    display: flex;
    align-items: center;
    gap: var(--crm-m);
    font-size: var(--crm-m3);
    font-weight: 600;
    color: var(--crm-c-text);
  }

  .checkbox-label span i {
    color: var(--makeaform-accent);
    font-size: var(--crm-small-font-size);
  }

  .field-info-box {
    margin-top: var(--crm-l);
    padding: var(--crm-r);
    background: var(--crm-c-layer1-bg);
    border: 1px solid var(--crm-c-gray-200);
    border-radius: var(--makeaform-radius);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--crm-m) 0;
  }

  .info-row:not(:last-child) {
    border-bottom: 1px solid var(--crm-c-gray-200);
  }

  .info-label {
    font-size: var(--crm-small-font-size);
    font-weight: 700;
    color: var(--crm-c-gray-600);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-value {
    font-size: var(--crm-small-font-size);
    color: var(--crm-c-gray-800);
    font-weight: 500;
  }

  code.info-value {
    background: var(--crm-c-layer0-bg);
    padding: var(--crm-xs1) var(--crm-m);
    border-radius: var(--crm-roundness);
    font-family: "Monaco", "Courier New", monospace;
    font-size: var(--crm-small-font-size);
    color: var(--makeaform-accent);
  }

  .delete-section {
    margin-top: var(--crm-r4);
    padding-top: var(--crm-r4);
    border-top: 1px solid var(--crm-c-gray-200);
  }

  .btn-delete-field {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--crm-m);
    padding: var(--crm-m1) var(--crm-r);
    background: transparent;
    border: 1px solid var(--crm-c-danger);
    border-radius: var(--makeaform-radius);
    color: var(--crm-c-danger);
    font-size: var(--crm-m3);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-delete-field:hover {
    background: var(--crm-c-danger);
    color: white;
  }
</style>
