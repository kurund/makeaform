import type { AdminData, AfformGetResult, AfformSaveParams } from '../types';

declare global {
  interface Window {
    CRM: any;
  }
}

/**
 * Load admin data including entities, fields, and blocks
 */
export async function loadAdminData(): Promise<AdminData> {
  // Load basic entity list (the loadAdminData custom action isn't critical)
  try {
    const entities = await window.CRM.api4('Entity', 'get', {
      select: ['name', 'title', 'title_plural', 'description', 'type', 'icon', 'primary_key'],
      where: [['searchable', '=', 'primary']],
    });

    const entityMap: Record<string, any> = {};
    for (const entity of entities) {
      entityMap[entity.name] = entity;
    }

    return {
      entities: entityMap,
      fields: {},
      blocks: []
    };
  } catch (error) {
    console.error('Failed to load entities:', error);
    // Return empty data so the app can still function
    return { entities: {}, fields: {}, blocks: [] };
  }
}

/**
 * Get all forms or filter by criteria
 */
export async function getForms(params: Record<string, any> = {}): Promise<AfformGetResult[]> {
  return await window.CRM.api4('Afform', 'get', params);
}

/**
 * Get a specific form by name
 */
export async function getForm(name: string): Promise<AfformGetResult | null> {
  const results = await window.CRM.api4('Afform', 'get', {
    where: [['name', '=', name]],
    layoutFormat: 'shallow'
  });
  return results[0] || null;
}

/**
 * Save a form (create or update)
 */
export async function saveForm(params: AfformSaveParams): Promise<any> {
  try {
    console.log('Saving form with params:', params);

    // Check if form exists first
    const existing = await window.CRM.api4('Afform', 'get', {
      where: [['name', '=', params.name]],
      limit: 1
    });

    let result;
    if (existing && existing.length > 0) {
      // Update existing form
      console.log('Updating existing form');
      result = await window.CRM.api4('Afform', 'update', {
        where: [['name', '=', params.name]],
        values: params
      });
    } else {
      // Create new form
      console.log('Creating new form');
      result = await window.CRM.api4('Afform', 'create', {
        values: params
      });
    }

    console.log('Save result:', result);
    return result;
  } catch (error: any) {
    console.error('Save API error:', error);
    // Extract the actual error message from CiviCRM API response
    if (error && typeof error === 'object') {
      const errorMessage = error.error_message || error.message || JSON.stringify(error);
      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Create a new form
 */
export async function createForm(params: AfformSaveParams): Promise<any> {
  return await window.CRM.api4('Afform', 'create', {
    values: params
  });
}

/**
 * Update an existing form
 */
export async function updateForm(name: string, params: Partial<AfformSaveParams>): Promise<any> {
  return await window.CRM.api4('Afform', 'update', {
    where: [['name', '=', name]],
    values: params
  });
}

/**
 * Delete a form
 */
export async function deleteForm(name: string): Promise<any> {
  return await window.CRM.api4('Afform', 'delete', {
    where: [['name', '=', name]]
  });
}

/**
 * Get entity fields for a given entity
 */
export async function getEntityFields(entityName: string): Promise<Record<string, any>> {
  const result = await window.CRM.api4(entityName, 'getFields', {
    loadOptions: ['id', 'label'],
    where: [['type', '!=', 'Extra']]
  });

  const fields: Record<string, any> = {};
  result.forEach((field: any) => {
    fields[field.name] = field;
  });

  return fields;
}
