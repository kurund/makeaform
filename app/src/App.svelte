<script lang="ts">
  import { onMount } from "svelte";
  import Toolbar from "./lib/components/Toolbar.svelte";
  import FieldNavigator from "./lib/components/FieldNavigator.svelte";
  import FieldPreview from "./lib/components/FieldPreview.svelte";
  import FieldSettings from "./lib/components/FieldSettings.svelte";
  import {
    store,
    setAdminData,
    setHasUnsavedChanges,
    nextField,
    prevField,
    canGoNext,
    canGoPrev,
  } from "./lib/stores/formStore.svelte";
  import { loadAdminData, saveForm } from "./lib/api/civicrm";

  let loading = $state(true);
  let error = $state<string | null>(null);

  // Keyboard shortcuts for navigation
  function handleKeyDown(e: KeyboardEvent) {
    // Don't trigger if user is typing in an input/textarea
    if (
      (e.target as HTMLElement).tagName === "INPUT" ||
      (e.target as HTMLElement).tagName === "TEXTAREA"
    ) {
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (canGoNext()) {
        nextField();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (canGoNext()) {
        nextField();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (canGoPrev()) {
        prevField();
      }
    }
  }

  onMount(async () => {
    try {
      const data = await loadAdminData();
      setAdminData(data);

      // Check if we're in edit mode (form name provided)
      const formName = (window as any).CRM?.vars?.makeaform?.formName;
      if (formName) {
        console.log("Loading form for editing:", formName);
        await loadExistingForm(formName);
      }

      loading = false;
    } catch (err) {
      console.error("Failed to load admin data:", err);
      error = "Failed to load form builder. Please refresh the page.";
      loading = false;
    }
  });

  async function loadExistingForm(formName: string) {
    try {
      const formData = await window.CRM.api4("Afform", "get", {
        where: [["name", "=", formName]],
        layoutFormat: "shallow",
      });

      if (formData && formData.length > 0) {
        const form = formData[0];
        console.log("Loaded form:", form);
        console.log("Form layout:", JSON.stringify(form.layout, null, 2));

        // Extract the form layout
        const layout = form.layout || [];

        // Find the af-form wrapper
        const afForm = layout.find((el: any) => el["#tag"] === "af-form");
        if (afForm && afForm["#children"]) {
          const children = afForm["#children"];

          // Separate af-entity from form elements
          const afEntity = children.find(
            (el: any) => el["#tag"] === "af-entity",
          );
          let formElements = children.filter(
            (el: any) => el["#tag"] !== "af-entity",
          );
          console.log(
            "Form elements loaded:",
            JSON.stringify(formElements, null, 2),
          );

          // CiviCRM stores certain properties as strings, we need to parse them back
          const parseAfformProperties = (elements: any[]): any[] => {
            return elements.map((el: any) => {
              const parsed = { ...el };

              // Parse defn if it's a string
              if (typeof parsed.defn === "string") {
                try {
                  // Use eval to parse the object literal (CiviCRM uses JS object notation, not JSON)
                  parsed.defn = eval("(" + parsed.defn + ")");
                } catch (e) {
                  console.error("Failed to parse defn:", parsed.defn, e);
                }
              }

              // Recursively process children
              if (parsed["#children"] && Array.isArray(parsed["#children"])) {
                parsed["#children"] = parseAfformProperties(
                  parsed["#children"],
                );
              }

              return parsed;
            });
          };

          formElements = parseAfformProperties(formElements);
          console.log(
            "Form elements after parsing:",
            JSON.stringify(formElements, null, 2),
          );

          // Set entity config if present
          if (afEntity) {
            // Parse actions if it's a string
            let actions = afEntity.actions;
            if (typeof actions === "string") {
              try {
                actions = eval("(" + actions + ")");
              } catch (e) {
                console.error("Failed to parse actions:", actions, e);
                actions = {};
              }
            }

            store.entityConfig = {
              type: afEntity.type,
              name: afEntity.name,
              actions: actions || {},
              security: afEntity.security || "RBAC",
            };
            store.selectedEntity = afEntity.type;

            // Load entity fields
            const fields = await window.CRM.api4(afEntity.type, "getFields", {
              loadOptions: ["id", "label"],
              where: [["type", "!=", "Extra"]],
            });
            const fieldsMap: Record<string, any> = {};
            fields.forEach((field: any) => {
              fieldsMap[field.name] = field;
            });
            store.entityFields = fieldsMap;
          }

          // Load form elements
          store.formElements = formElements;
        }

        // Set metadata
        store.formMetadata = {
          name: form.name,
          title: form.title || "",
          description: form.description || "",
          type: form.type || "form",
          server_route: form.server_route || "",
        };

        store.hasUnsavedChanges = false;
      }
    } catch (err) {
      console.error("Failed to load form:", err);
      alert("Failed to load form: " + (err as any).message);
    }
  }

  // Helper function to get entity field defaults
  function getEntityFieldDefaults(fieldName: string): any {
    const field = store.entityFields[fieldName];
    if (!field) return {};

    return {
      label: field.label || field.title || fieldName,
      input_type: field.input_type || "Text",
      required: field.required || false,
      placeholder: "",
      help_post: field.help_pre || field.help_post || "",
    };
  }

  // Helper function to check if field has customizations
  function hasCustomizations(field: any): boolean {
    const entityDefaults = getEntityFieldDefaults(field.name);
    if (!field.defn) return false;

    const checkProps = [
      "label",
      "input_type",
      "required",
      "placeholder",
      "help_post",
    ];

    for (const key of checkProps) {
      const currentValue = field.defn[key];
      const defaultValue = entityDefaults[key];

      // Handle empty strings and undefined
      if (currentValue === "" && !defaultValue) continue;
      if (currentValue !== defaultValue) return true;
    }

    return false;
  }

  // Helper function to get only customized defn properties
  function getCustomDefn(field: any): any {
    const entityDefaults = getEntityFieldDefaults(field.name);
    const customDefn: any = {};

    const checkProps = [
      "label",
      "input_type",
      "required",
      "placeholder",
      "help_post",
    ];

    for (const key of checkProps) {
      const currentValue = field.defn?.[key];
      const defaultValue = entityDefaults[key];

      // Only include if different from default (and not empty string vs undefined)
      if (currentValue === "" && !defaultValue) continue;
      if (currentValue !== defaultValue && currentValue !== undefined) {
        customDefn[key] = currentValue;
      }
    }

    return Object.keys(customDefn).length > 0 ? customDefn : null;
  }

  async function handleSave() {
    try {
      // Build the proper Afform structure
      const formChildren: any[] = [];

      // 1. Add af-entity with all attributes
      if (store.entityConfig) {
        formChildren.push({
          "#tag": "af-entity",
          data: store.entityConfig.data || { source: "" },
          type: store.entityConfig.type,
          name: store.entityConfig.name,
          label: store.entityConfig.label || store.entityConfig.name,
          actions: store.entityConfig.actions,
          security: store.entityConfig.security || "RBAC",
        });
      }

      // 2. Process form elements (fieldsets and buttons)
      let fieldsetIndex = 0;
      const processedElements = store.formElements.map((element: any) => {
        if (element["#tag"] === "fieldset") {
          // Get af-field children
          const fields =
            element["#children"]?.filter(
              (c: any) => c["#tag"] === "af-field",
            ) || [];

          // Process each field - remove IDs, filter defn
          const processedFields = fields.map((field: any) => {
            const fieldDef: any = {
              "#tag": "af-field",
              name: field.name,
            };

            // Only add defn if there are customizations
            const customDefn = getCustomDefn(field);
            if (customDefn) {
              fieldDef.defn = customDefn;
            }

            return fieldDef;
          });

          // Wrap fields in container div with actions
          const containerDiv = {
            "#tag": "div",
            actions: element.actions || { update: true, delete: true },
            class: "af-container",
            "#children": processedFields,
          };

          // Generate fieldset name: Individual1, Individual2, etc.
          const entityBaseName = store.entityConfig?.type || "Entity";
          fieldsetIndex++;
          const fieldsetName = `${entityBaseName}${fieldsetIndex}`;

          // Return fieldset with proper structure (no id attribute)
          return {
            "#tag": "fieldset",
            "af-fieldset": fieldsetName,
            "af-title": element.label || element["af-fieldset"] || "Form Section",
            class: "af-container",
            "#children": [containerDiv],
          };
        } else if (element["#tag"] === "button") {
          // Process button - remove id attribute
          return {
            "#tag": "button",
            class: element.class || "af-button btn btn-primary",
            "crm-icon": element["crm-icon"] || "fa-check",
            "ng-click": element["ng-click"] || "afform.submit()",
            "ng-if": element["ng-if"] || "afform.showSubmitButton",
            "#children": element["#children"] || ["Submit"],
          };
        }
        return element;
      });

      formChildren.push(...processedElements);

      // Wrap everything in af-form
      const layout = [
        {
          "#tag": "af-form",
          ctrl: "afform",
          "#children": formChildren,
        },
      ];

      await saveForm({
        name: store.formMetadata.name,
        title: store.formMetadata.title,
        description: store.formMetadata.description,
        server_route: store.formMetadata.server_route,
        layout: layout,
      });
      setHasUnsavedChanges(false);
      window.CRM.alert("Form saved successfully!", "Success", "success");
    } catch (err: any) {
      console.error("Save failed:", err);
      const errorMsg =
        err?.error_message || err?.message || "Unknown error occurred";
      alert("Save failed: " + errorMsg);
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="form-builder-app">
  {#if loading}
    <div class="loading-screen">
      <i class="fa fa-spinner fa-spin fa-3x"></i>
      <p>Loading Form Builder...</p>
    </div>
  {:else if error}
    <div class="error-screen">
      <i class="fa fa-exclamation-triangle fa-3x"></i>
      <p>{error}</p>
    </div>
  {:else}
    <Toolbar onSave={handleSave} />

    <div class="form-builder-content">
      <div class="panel-left">
        <FieldNavigator />
      </div>

      <div class="panel-center">
        <FieldPreview />
      </div>

      <div class="panel-right">
        <FieldSettings />
      </div>
    </div>
  {/if}
</div>

<style>
  :root {
    --makeaform-accent: var(--crm-c-link);
    --makeaform-accent-hover: var(--crm-c-link-hover);
    --makeaform-accent-bg: color-mix(
      in srgb,
      var(--crm-c-link) 10%,
      transparent 90%
    );
    --makeaform-radius: 0.5rem; /* 8px - maintain modern rounded corners */
  }

  .form-builder-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--crm-c-container-bg);
    margin: 0;
    padding: 0;
    font-family: var(--crm-font);
  }

  .loading-screen,
  .error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: var(--crm-c-gray-800);
    background: var(--crm-c-container-bg);
  }

  .loading-screen i,
  .error-screen i {
    margin-bottom: var(--crm-r2);
    color: var(--makeaform-accent);
  }

  .loading-screen p,
  .error-screen p {
    font-size: var(--crm-r1);
    margin: 0;
    font-weight: 500;
  }

  .error-screen i {
    color: var(--crm-c-danger);
  }

  .form-builder-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .panel-left {
    width: 280px;
    flex-shrink: 0;
    background: var(--crm-c-layer0-bg);
    border-right: 1px solid var(--crm-c-gray-200);
  }

  .panel-center {
    flex: 1;
    min-width: 0;
    background: var(--crm-c-container-bg);
  }

  .panel-right {
    width: 320px;
    flex-shrink: 0;
    background: var(--crm-c-layer0-bg);
    border-left: 1px solid var(--crm-c-gray-200);
  }

  @media (max-width: 1200px) {
    .panel-left {
      width: 250px;
    }

    .panel-right {
      width: 280px;
    }
  }
</style>
