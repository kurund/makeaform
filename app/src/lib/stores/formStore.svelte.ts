import type { FormElement, AfformMetadata, AdminData, EntityConfig } from '../types';

// Create a reactive state object
class FormStore {
  formElements = $state<FormElement[]>([]);
  formMetadata = $state<AfformMetadata>({
    name: 'new_form',
    title: 'New Form',
    description: '',
    type: 'form',
    server_route: ''
  });
  entityConfig = $state<EntityConfig | null>(null);
  selectedElementId = $state<string | null>(null);
  adminData = $state<AdminData | null>(null);
  selectedEntity = $state<string | null>(null);
  entityFields = $state<Record<string, any>>({});
  isSaving = $state(false);
  hasUnsavedChanges = $state(false);

  // Derived state - get selected element
  get selectedElement() {
    return this.selectedElementId
      ? findElementById(this.formElements, this.selectedElementId)
      : null;
  }
}

export const store = new FormStore();

/**
 * Find an element by its ID in the tree
 */
function findElementById(elements: FormElement[], id: string): FormElement | null {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el['#children']) {
      const found = findElementById(el['#children'], id);
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
    if (el['#tag'] === 'af-field' && el.name === fieldName) {
      return true;
    }
    if (el['#children']) {
      if (fieldExists(el['#children'], fieldName)) {
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
  if (element['#tag'] === 'af-field' && element.name) {
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
      if (!parent['#children']) {
        parent['#children'] = [];
      }
      parent['#children'].push(element);
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
    const index = elements.findIndex(el => el.id === id);
    if (index !== -1) {
      elements.splice(index, 1);
      return true;
    }
    for (const el of elements) {
      if (el['#children'] && removeFromArray(el['#children'])) {
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
export function moveElement(elementId: string, newParentId: string | null, newIndex: number) {
  // Find and remove element
  let element: FormElement | null = null;

  function removeElement(elements: FormElement[]): boolean {
    const index = elements.findIndex(el => el.id === elementId);
    if (index !== -1) {
      element = elements.splice(index, 1)[0];
      return true;
    }
    for (const el of elements) {
      if (el['#children'] && removeElement(el['#children'])) {
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
      if (!parent['#children']) {
        parent['#children'] = [];
      }
      parent['#children'].splice(newIndex, 0, element);
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
    name: 'new_form',
    title: 'New Form',
    description: '',
    type: 'form',
    server_route: ''
  };
  store.selectedElementId = null;
  store.hasUnsavedChanges = false;
}
