import type {
  FormElement,
  AfformMetadata,
  AdminData,
  EntityConfig,
} from "../types";

// Create a reactive state object
class FormStore {
  formElements = $state<FormElement[]>([]);
  formMetadata = $state<AfformMetadata>({
    name: "new_form",
    title: "New Form",
    description: "",
    type: "form",
    server_route: "",
    is_public: false,
  });
  entityConfigs = $state<EntityConfig[]>([]);
  selectedElementId = $state<string | null>(null);
  adminData = $state<AdminData | null>(null);
  selectedEntity = $state<string | null>(null);
  entityFields = $state<Record<string, any>>({});
  isSaving = $state(false);
  hasUnsavedChanges = $state(false);

  // Typeform-style navigation
  currentPageIndex = $state(0); // Index of current fieldset/page
  currentFieldIndex = $state(0); // Index of current field within page

  // Derived state - get selected element
  get selectedElement() {
    return this.selectedElementId
      ? findElementById(this.formElements, this.selectedElementId)
      : null;
  }

  // Derived state - get all pages (fieldsets)
  get pages() {
    return this.formElements.filter((el) => el["#tag"] === "fieldset");
  }

  // Derived state - get current page
  get currentPage() {
    return this.pages[this.currentPageIndex] || null;
  }

  // Derived state - get all fields in current page
  get currentPageFields() {
    if (!this.currentPage || !this.currentPage["#children"]) {
      return [];
    }
    return this.currentPage["#children"].filter(
      (child) => child["#tag"] === "af-field",
    );
  }

  // Derived state - get current field
  get currentField() {
    const fields = this.currentPageFields;
    return fields[this.currentFieldIndex] || null;
  }

  // Derived state - get total field count across all pages
  get totalFields() {
    let count = 0;
    for (const page of this.pages) {
      if (page["#children"]) {
        count += page["#children"].filter(
          (child) => child["#tag"] === "af-field",
        ).length;
      }
    }
    return count;
  }
}

export const store = new FormStore();

/**
 * Find an element by its ID in the tree
 */
function findElementById(
  elements: FormElement[],
  id: string,
): FormElement | null {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el["#children"]) {
      const found = findElementById(el["#children"], id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Select an element
 */
export function selectElement(id: string | null) {
  store.selectedElementId = id;
}

/**
 * Set unsaved changes flag
 */
export function setHasUnsavedChanges(value: boolean) {
  store.hasUnsavedChanges = value;
}

/**
 * Set saving flag
 */
export function setIsSaving(value: boolean) {
  store.isSaving = value;
}

/**
 * Check if a field with the same name already exists
 */
function fieldExists(elements: FormElement[], fieldName: string): boolean {
  for (const el of elements) {
    if (el["#tag"] === "af-field" && el.name === fieldName) {
      return true;
    }
    if (el["#children"]) {
      if (fieldExists(el["#children"], fieldName)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Add a new element
 */
export function addElement(element: FormElement, parentId?: string) {
  // Check if this is a field that already exists
  if (element["#tag"] === "af-field" && element.name) {
    if (fieldExists(store.formElements, element.name)) {
      alert(`Field "${element.name}" is already in the form`);
      return;
    }
  }

  if (!element.id) {
    element.id = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  if (parentId) {
    const parent = findElementById(store.formElements, parentId);
    if (parent) {
      if (!parent["#children"]) {
        parent["#children"] = [];
      }
      parent["#children"].push(element);
    }
  } else {
    store.formElements.push(element);
  }

  store.hasUnsavedChanges = true;
  selectElement(element.id);
}

/**
 * Update an element's properties
 */
export function updateElement(id: string, updates: Partial<FormElement>) {
  const element = findElementById(store.formElements, id);
  if (element) {
    Object.assign(element, updates);
    store.hasUnsavedChanges = true;
  }
}

/**
 * Delete an element
 */
export function deleteElement(id: string) {
  function removeFromArray(elements: FormElement[]): boolean {
    const index = elements.findIndex((el) => el.id === id);
    if (index !== -1) {
      elements.splice(index, 1);
      return true;
    }
    for (const el of elements) {
      if (el["#children"] && removeFromArray(el["#children"])) {
        return true;
      }
    }
    return false;
  }

  removeFromArray(store.formElements);
  store.hasUnsavedChanges = true;
  if (store.selectedElementId === id) {
    selectElement(null);
  }
}

/**
 * Move an element to a new position
 */
export function moveElement(
  elementId: string,
  newParentId: string | null,
  newIndex: number,
) {
  // Find and remove element
  let element: FormElement | null = null;

  function removeElement(elements: FormElement[]): boolean {
    const index = elements.findIndex((el) => el.id === elementId);
    if (index !== -1) {
      element = elements.splice(index, 1)[0];
      return true;
    }
    for (const el of elements) {
      if (el["#children"] && removeElement(el["#children"])) {
        return true;
      }
    }
    return false;
  }

  removeElement(store.formElements);

  if (!element) return;

  // Insert at new position
  if (newParentId) {
    const parent = findElementById(store.formElements, newParentId);
    if (parent) {
      if (!parent["#children"]) {
        parent["#children"] = [];
      }
      parent["#children"].splice(newIndex, 0, element);
    }
  } else {
    store.formElements.splice(newIndex, 0, element);
  }

  store.hasUnsavedChanges = true;
}

/**
 * Load form data
 */
export function loadForm(elements: FormElement[], metadata: AfformMetadata) {
  store.formElements = elements;
  store.formMetadata = metadata;
  store.selectedElementId = null;
  store.hasUnsavedChanges = false;
}

/**
 * Set admin data
 */
export function setAdminData(data: AdminData) {
  store.adminData = data;
}

/**
 * Set selected entity
 */
export function setSelectedEntity(entityName: string | null) {
  store.selectedEntity = entityName;
}

/**
 * Set entity fields
 */
export function setEntityFields(fields: Record<string, any>) {
  store.entityFields = fields;
}

/**
 * Reset to empty form
 */
export function resetForm() {
  store.formElements = [];
  store.formMetadata = {
    name: "new_form",
    title: "New Form",
    description: "",
    type: "form",
    server_route: "",
    is_public: false,
  };
  store.selectedElementId = null;
  store.hasUnsavedChanges = false;
  store.currentPageIndex = 0;
  store.currentFieldIndex = 0;
}

/**
 * Navigation: Go to next field
 */
export function nextField() {
  const fields = store.currentPageFields;

  // If there's a next field in current page
  if (store.currentFieldIndex < fields.length - 1) {
    store.currentFieldIndex++;
  }
  // Otherwise, go to first field of next page
  else if (store.currentPageIndex < store.pages.length - 1) {
    store.currentPageIndex++;
    store.currentFieldIndex = 0;
  }

  // Update selected element
  if (store.currentField) {
    store.selectedElementId = store.currentField.id || null;
  }
}

/**
 * Navigation: Go to previous field
 */
export function prevField() {
  // If there's a previous field in current page
  if (store.currentFieldIndex > 0) {
    store.currentFieldIndex--;
  }
  // Otherwise, go to last field of previous page
  else if (store.currentPageIndex > 0) {
    store.currentPageIndex--;
    const prevPageFields = store.currentPageFields;
    store.currentFieldIndex = Math.max(0, prevPageFields.length - 1);
  }

  // Update selected element
  if (store.currentField) {
    store.selectedElementId = store.currentField.id || null;
  }
}

/**
 * Navigation: Go to specific page and field
 */
export function gotoField(pageIndex: number, fieldIndex: number = 0) {
  if (pageIndex >= 0 && pageIndex < store.pages.length) {
    store.currentPageIndex = pageIndex;
    const page = store.pages[pageIndex];
    const fields =
      page["#children"]?.filter((child) => child["#tag"] === "af-field") || [];
    store.currentFieldIndex = Math.min(
      fieldIndex,
      Math.max(0, fields.length - 1),
    );

    // Update selected element
    if (store.currentField) {
      store.selectedElementId = store.currentField.id || null;
    }
  }
}

/**
 * Navigation: Check if we can go to next field
 */
export function canGoNext(): boolean {
  const fields = store.currentPageFields;
  return (
    store.currentFieldIndex < fields.length - 1 ||
    store.currentPageIndex < store.pages.length - 1
  );
}

/**
 * Navigation: Check if we can go to previous field
 */
export function canGoPrev(): boolean {
  return store.currentFieldIndex > 0 || store.currentPageIndex > 0;
}

/**
 * Move a page/entity up in the order
 */
export function movePageUp(pageIndex: number) {
  if (pageIndex <= 0 || pageIndex >= store.pages.length) return;

  // Find the indices of the two pages in formElements
  const pages = store.pages;
  const pageToMove = pages[pageIndex];
  const pageBefore = pages[pageIndex - 1];

  const indexToMove = store.formElements.indexOf(pageToMove);
  const indexBefore = store.formElements.indexOf(pageBefore);

  if (indexToMove === -1 || indexBefore === -1) return;

  // Swap the pages in formElements
  [store.formElements[indexBefore], store.formElements[indexToMove]] = [
    store.formElements[indexToMove],
    store.formElements[indexBefore],
  ];

  // Update current page index if needed
  if (store.currentPageIndex === pageIndex) {
    store.currentPageIndex = pageIndex - 1;
  } else if (store.currentPageIndex === pageIndex - 1) {
    store.currentPageIndex = pageIndex;
  }

  store.hasUnsavedChanges = true;
}

/**
 * Move a page/entity down in the order
 */
export function movePageDown(pageIndex: number) {
  if (pageIndex < 0 || pageIndex >= store.pages.length - 1) return;

  // Find the indices of the two pages in formElements
  const pages = store.pages;
  const pageToMove = pages[pageIndex];
  const pageAfter = pages[pageIndex + 1];

  const indexToMove = store.formElements.indexOf(pageToMove);
  const indexAfter = store.formElements.indexOf(pageAfter);

  if (indexToMove === -1 || indexAfter === -1) return;

  // Swap the pages in formElements
  [store.formElements[indexToMove], store.formElements[indexAfter]] = [
    store.formElements[indexAfter],
    store.formElements[indexToMove],
  ];

  // Update current page index if needed
  if (store.currentPageIndex === pageIndex) {
    store.currentPageIndex = pageIndex + 1;
  } else if (store.currentPageIndex === pageIndex + 1) {
    store.currentPageIndex = pageIndex;
  }

  store.hasUnsavedChanges = true;
}
