<script lang="ts">
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
  let initialized = $state(false);
  let isEditingExistingForm = $state(false);
  let originalFormName = $state<string | null>(null);

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

  // Initialize on mount using $effect
  $effect(() => {
    if (initialized) return;
    initialized = true;

    (async () => {
      try {
        const data = await loadAdminData();
        setAdminData(data);

        // Check if we're in edit mode (form name provided)
        const formName = (window as any).CRM?.vars?.makeaform?.formName;
        if (formName) {
          isEditingExistingForm = true;
          originalFormName = formName;
          await loadExistingForm(formName);
        }

        loading = false;
      } catch (err) {
        console.error("Failed to load admin data:", err);
        error = "Failed to load form builder. Please refresh the page.";
        loading = false;
      }
    })();
  });

  async function loadExistingForm(formName: string) {
    try {
      const formData = await window.CRM.api4("Afform", "get", {
        where: [["name", "=", formName]],
        layoutFormat: "shallow",
      });

      if (formData && formData.length > 0) {
        const form = formData[0];

        // Extract the form layout
        const layout = form.layout || [];

        // Find the af-form wrapper
        const afForm = layout.find((el: any) => el["#tag"] === "af-form");
        if (afForm && afForm["#children"]) {
          const children = afForm["#children"];

          // Separate af-entity elements from form elements
          const afEntities = children.filter(
            (el: any) => el["#tag"] === "af-entity",
          );
          let formElements = children.filter(
            (el: any) => el["#tag"] !== "af-entity",
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
                  // Keep original string if parsing fails
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

          // Process ALL af-entity elements
          store.entityConfigs = [];
          for (const afEntity of afEntities) {
            // Parse actions if it's a string
            let actions = afEntity.actions;
            if (typeof actions === "string") {
              try {
                actions = eval("(" + actions + ")");
              } catch (e) {
                actions = {};
              }
            }

            // Parse data if it's a string
            let data = afEntity.data;
            if (typeof data === "string") {
              try {
                data = eval("(" + data + ")");
              } catch (e) {
                data = {};
              }
            }

            store.entityConfigs.push({
              type: afEntity.type,
              name: afEntity.name,
              label: afEntity.label || afEntity.name,
              data: data || { source: "" },
              actions: actions || {},
              security: afEntity.security || "RBAC",
            });
          }

          // Set selected entity to the first one
          if (afEntities.length > 0) {
            const firstEntity = afEntities[0];
            store.selectedEntity = firstEntity.type;

            // Load entity fields for the first entity
            const fields = await window.CRM.api4(
              firstEntity.type,
              "getFields",
              {
                loadOptions: ["id", "label"],
                where: [["type", "!=", "Extra"]],
              },
            );
            const fieldsMap: Record<string, any> = {};
            fields.forEach((field: any) => {
              fieldsMap[field.name] = field;
            });
            store.entityFields = fieldsMap;
          }

          // Process fieldsets to add entityType based on af-fieldset -> entity mapping
          formElements = formElements.map((el: any) => {
            if (el["#tag"] === "fieldset" && el["af-fieldset"]) {
              // Find the matching entity config
              const entityConfig = store.entityConfigs.find(
                (ec) => ec.name === el["af-fieldset"],
              );
              if (entityConfig) {
                el.entityType = entityConfig.type;
                el.label = el["af-title"] || el.label || entityConfig.label;
              }
              // Add ID for internal use
              el.id =
                el.id ||
                `fieldset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              // Flatten fields from container div if present
              if (el["#children"]) {
                const containerDiv = el["#children"].find(
                  (c: any) =>
                    c["#tag"] === "div" && c.class?.includes("af-container"),
                );
                if (containerDiv && containerDiv["#children"]) {
                  // Process children - handle both af-field and af-join elements
                  el["#children"] = containerDiv["#children"].map(
                    (child: any) => {
                      if (child["af-join"]) {
                        // This is a join entity - flatten its fields
                        const joinEl = {
                          ...child,
                          id:
                            child.id ||
                            `join_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        };

                        // Parse join actions if string
                        if (typeof joinEl.actions === "string") {
                          try {
                            joinEl.actions = eval("(" + joinEl.actions + ")");
                          } catch (e) {
                            joinEl.actions = { update: true, delete: true };
                          }
                        }

                        // Flatten join fields from inner container
                        if (joinEl["#children"]) {
                          const joinContainer = joinEl["#children"].find(
                            (c: any) =>
                              c["#tag"] === "div" &&
                              c.class?.includes("af-container"),
                          );
                          if (joinContainer && joinContainer["#children"]) {
                            joinEl["#children"] = joinContainer["#children"].map(
                              (field: any) => ({
                                ...field,
                                id:
                                  field.id ||
                                  `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              }),
                            );
                          } else {
                            // No inner container, just add IDs to existing children
                            joinEl["#children"] = joinEl["#children"].map(
                              (field: any) => ({
                                ...field,
                                id:
                                  field.id ||
                                  `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              }),
                            );
                          }
                        }

                        return joinEl;
                      } else {
                        // Regular af-field element
                        return {
                          ...child,
                          id:
                            child.id ||
                            `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        };
                      }
                    },
                  );
                  // Preserve container actions
                  if (containerDiv.actions) {
                    el.actions = containerDiv.actions;
                  }
                }
              }
            } else if (el["#tag"] === "button") {
              el.id = el.id || `button_${Date.now()}`;
              // Normalize button children to string format
              if (el["#children"] && el["#children"].length > 0) {
                const firstChild = el["#children"][0];
                if (typeof firstChild !== "string") {
                  // Extract text from object format
                  let buttonText = "Submit";
                  if (firstChild["#text"]) {
                    buttonText = firstChild["#text"];
                  } else if (firstChild["#markup"]) {
                    buttonText = firstChild["#markup"];
                  }
                  el["#children"] = [buttonText];
                }
              } else {
                el["#children"] = ["Submit"];
              }
            }
            return el;
          });

          // Load form elements
          store.formElements = formElements;

          // Load fields for all join entities found in the form
          const joinNames = new Set<string>();
          for (const element of formElements) {
            if (element["#tag"] === "fieldset" && element["#children"]) {
              for (const child of element["#children"]) {
                if (child["af-join"]) {
                  joinNames.add(child["af-join"]);
                }
              }
            }
          }
          for (const joinName of joinNames) {
            try {
              const joinFields = await window.CRM.api4(joinName, "getFields", {
                loadOptions: ["id", "label"],
                where: [["type", "!=", "Extra"]],
              });
              const fieldsMap: Record<string, any> = {};
              joinFields.forEach((field: any) => {
                fieldsMap[field.name] = field;
              });
              store.joinEntityFields[joinName] = fieldsMap;
            } catch (err) {
              console.error(`Failed to load fields for join entity ${joinName}:`, err);
            }
          }
        }

        // Set metadata - preserve all existing form properties
        store.formMetadata = {
          name: form.name,
          title: form.title || "",
          type: form.type || "form",
          description: form.description ?? null,
          icon: form.icon ?? null,
          server_route: form.server_route || "",
          permission: form.permission ?? null,
          permission_operator: form.permission_operator ?? null,
          placement: form.placement ?? null,
          placement_filters: form.placement_filters ?? null,
          placement_weight: form.placement_weight ?? null,
          submit_enabled: form.submit_enabled ?? true,
          create_submission: form.create_submission ?? true,
          submit_limit: form.submit_limit ?? null,
          confirmation_type: form.confirmation_type ?? null,
          confirmation_message: form.confirmation_message ?? null,
          redirect: form.redirect ?? null,
          is_public: form.is_public ?? false,
          requires: form.requires ?? null,
          entity_type: form.entity_type ?? null,
          join_entity: form.join_entity ?? null,
          tags: form.tags ?? null,
          manual_processing: form.manual_processing ?? null,
          allow_verification_by_email: form.allow_verification_by_email ?? null,
          email_confirmation_template_id:
            form.email_confirmation_template_id ?? null,
          autosave_draft: form.autosave_draft ?? null,
          navigation: form.navigation ?? null,
        };

        store.hasUnsavedChanges = false;
      }
    } catch (err) {
      console.error("Failed to load form:", err);
      alert("Failed to load form: " + (err as any).message);
    }
  }

  // Helper function to build defn for saving
  // Preserves all existing properties from afform, updates with our edits
  function buildFieldDefn(field: any): any {
    if (!field.defn) return null;

    // Start with a copy of all existing defn properties to preserve afform data
    const defn: any = { ...field.defn };

    // Remove internal properties that shouldn't be saved
    delete defn.options; // Options come from entity, not saved in defn

    // Clean up empty values
    if (!defn.placeholder) delete defn.placeholder;
    if (!defn.help_post) delete defn.help_post;

    return Object.keys(defn).length > 0 ? defn : null;
  }

  // Generate form name from server_route
  function generateFormName(serverRoute: string): string {
    const path = serverRoute.replace(/^civicrm\//, "");
    const camelCase = path
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
    return "afform" + camelCase;
  }

  async function handleSave() {
    try {
      const meta = store.formMetadata;

      // Generate form name for new forms (only at save time)
      if (!isEditingExistingForm && meta.server_route) {
        const generatedName = generateFormName(meta.server_route);

        // Check if form with this name already exists
        const existingForms = await window.CRM.api4("Afform", "get", {
          select: ["name"],
          where: [["name", "=", generatedName]],
        });

        if (existingForms && existingForms.length > 0) {
          alert(
            `A form with the name "${generatedName}" already exists. Please use a different form path.`,
          );
          return;
        }

        // Set the generated name
        store.formMetadata.name = generatedName;
      }

      // Build the proper Afform structure
      const formChildren: any[] = [];

      // 1. Add ALL af-entity elements at the top
      for (const entityConfig of store.entityConfigs) {
        formChildren.push({
          "#tag": "af-entity",
          data: entityConfig.data || { source: "" },
          type: entityConfig.type,
          name: entityConfig.name,
          label: entityConfig.label || entityConfig.name,
          actions: entityConfig.actions,
          security: entityConfig.security || "RBAC",
        });
      }

      // 2. Separate fieldsets and buttons
      const fieldsets = store.formElements.filter(
        (el: any) => el["#tag"] === "fieldset",
      );
      const buttons = store.formElements.filter(
        (el: any) => el["#tag"] === "button",
      );

      // 3. Process fieldsets
      for (const element of fieldsets) {
        // Get af-field children (direct fields)
        const fields =
          element["#children"]?.filter((c: any) => c["#tag"] === "af-field") ||
          [];

        // Get join entity children
        const joins =
          element["#children"]?.filter((c: any) => c["af-join"]) || [];

        // Process each field - remove IDs, build defn
        const processedFields = fields.map((field: any) => {
          const fieldDef: any = {
            "#tag": "af-field",
            name: field.name,
          };

          // Add defn with field properties
          const defn = buildFieldDefn(field);
          if (defn) {
            fieldDef.defn = defn;
          }

          return fieldDef;
        });

        // Process join entities
        const processedJoins = joins.map((joinEl: any) => {
          // Get fields from the join element
          const joinFields =
            joinEl["#children"]?.filter((c: any) => c["#tag"] === "af-field") ||
            [];

          // Process join fields
          const processedJoinFields = joinFields.map((field: any) => {
            const fieldDef: any = {
              "#tag": "af-field",
              name: field.name,
            };

            const defn = buildFieldDefn(field);
            if (defn) {
              fieldDef.defn = defn;
            }

            return fieldDef;
          });

          // Parse join actions
          let joinActions = { update: true, delete: true };
          if (joinEl.actions) {
            if (typeof joinEl.actions === "string") {
              try {
                joinActions = eval("(" + joinEl.actions + ")");
              } catch (e) {
                // Keep default
              }
            } else {
              joinActions = joinEl.actions;
            }
          }

          // Build the af-join structure
          return {
            "#tag": "div",
            "af-join": joinEl["af-join"],
            actions: joinActions,
            "#children": [
              {
                "#tag": "div",
                class: "af-container af-layout-inline",
                "#children": processedJoinFields,
              },
            ],
          };
        });

        // Wrap fields in container div with actions
        // Ensure actions is an object, not a string
        let containerActions = { update: true, delete: true };
        if (element.actions) {
          if (typeof element.actions === "string") {
            try {
              containerActions = eval("(" + element.actions + ")");
            } catch (e) {
              // Keep default actions if parsing fails
            }
          } else {
            containerActions = element.actions;
          }
        }

        // Combine fields and joins in the container
        const containerChildren = [...processedFields, ...processedJoins];

        const containerDiv = {
          "#tag": "div",
          actions: containerActions,
          class: "af-container",
          "#children": containerChildren,
        };

        // Use the af-fieldset value from the element (e.g., "Individual1")
        formChildren.push({
          "#tag": "fieldset",
          "af-fieldset": element["af-fieldset"],
          "af-title": element.label || element["af-fieldset"] || "Form Section",
          class: "af-container",
          "#children": [containerDiv],
        });
      }

      // 4. Add button(s) LAST
      for (const element of buttons) {
        // Button children should already be normalized to string format
        const buttonText =
          (element["#children"] && element["#children"][0]) || "Submit";

        formChildren.push({
          "#tag": "button",
          class: element.class || "af-button btn btn-primary",
          "crm-icon": element["crm-icon"] || "fa-check",
          "ng-click": element["ng-click"] || "afform.submit()",
          "ng-if": element["ng-if"] || "afform.showSubmitButton",
          "#children": [{ "#text": buttonText }],
        });
      }

      // Wrap everything in af-form
      const layout = [
        {
          "#tag": "af-form",
          ctrl: "afform",
          "#children": formChildren,
        },
      ];

      // Build save params - only include fields with values (matches afform admin behavior)
      // Ensure placement_filters is an object, not array
      let placementFilters = meta.placement_filters;
      if (!placementFilters || Array.isArray(placementFilters)) {
        placementFilters = {};
      }

      const saveParams: Record<string, any> = {
        name: meta.name,
        type: meta.type || "form",
        title: meta.title,
        icon: meta.icon || "fa-list-alt",
        permission: meta.permission || ["access CiviCRM"],
        permission_operator: meta.permission_operator || "AND",
        placement: meta.placement || [],
        placement_filters: placementFilters,
        submit_enabled: meta.submit_enabled !== false,
        create_submission: meta.create_submission !== false,
        is_public: meta.is_public || false,
        layout: layout,
      };

      // Only include optional fields if they have values
      if (meta.server_route) saveParams.server_route = meta.server_route;
      if (meta.description) saveParams.description = meta.description;
      if (meta.confirmation_type)
        saveParams.confirmation_type = meta.confirmation_type;
      if (meta.confirmation_message)
        saveParams.confirmation_message = meta.confirmation_message;
      if (meta.redirect) saveParams.redirect = meta.redirect;
      if (meta.requires) saveParams.requires = meta.requires;
      if (meta.entity_type) saveParams.entity_type = meta.entity_type;
      if (meta.join_entity) saveParams.join_entity = meta.join_entity;
      if (meta.tags) saveParams.tags = meta.tags;
      if (meta.navigation) saveParams.navigation = meta.navigation;
      if (meta.submit_limit) saveParams.submit_limit = meta.submit_limit;
      if (meta.placement_weight)
        saveParams.placement_weight = meta.placement_weight;

      await saveForm(saveParams);
      setHasUnsavedChanges(false);

      // Update URL with form name so reload will edit this form
      const currentUrl = new URL(window.location.href);
      if (
        !currentUrl.searchParams.has("name") ||
        currentUrl.searchParams.get("name") !== meta.name
      ) {
        currentUrl.searchParams.set("name", meta.name);
        window.history.replaceState({}, "", currentUrl.toString());
        // Also update CRM.vars so the app knows we're now editing
        if (window.CRM?.vars?.makeaform) {
          window.CRM.vars.makeaform.formName = meta.name;
        }
      }

      // Mark as editing existing form after first save
      isEditingExistingForm = true;
      originalFormName = meta.name;

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
    --makeaform-accent: var(--crm-link-color);
    --makeaform-accent-hover: var(--crm-link-hover-color);
    --makeaform-accent-bg: color-mix(
      in srgb,
      var(--crm-link-color) 8%,
      transparent 92%
    );
    --makeaform-radius: 6px;
    --makeaform-radius-sm: 4px;
    --makeaform-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
    --makeaform-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);
    --makeaform-shadow-focus: 0 0 0 3px var(--makeaform-accent-bg);
  }

  .form-builder-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--crm-container-bg-color);
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
    background: var(--crm-container-bg-color);
  }

  .loading-screen i,
  .error-screen i {
    margin-bottom: var(--crm-l-reg-2);
    color: var(--makeaform-accent);
  }

  .loading-screen p,
  .error-screen p {
    font-size: var(--crm-l-reg-1);
    margin: 0;
    font-weight: 500;
  }

  .error-screen i {
    color: var(--crm-danger-color);
  }

  .form-builder-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .panel-left {
    width: 280px;
    flex-shrink: 0;
    background: var(--crm-paper);
    border-right: 1px solid var(--crm-c-gray-200);
  }

  .panel-center {
    flex: 1;
    min-width: 0;
    background: var(--crm-container-bg-color);
  }

  .panel-right {
    width: 320px;
    flex-shrink: 0;
    background: var(--crm-paper);
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
