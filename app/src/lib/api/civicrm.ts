import type { AdminData, AfformGetResult, AfformSaveParams } from "../types";

declare global {
  interface Window {
    CRM: any;
  }
}

/**
 * Load admin data including entities for the form builder
 * Uses our custom Makeaform API to get available entities
 */
export async function loadAdminData(): Promise<AdminData> {
  try {
    // Call our custom Makeaform API to get available entities
    const result = await window.CRM.api4("Makeaform", "getEntities", {});

    // Convert array result to object keyed by entity name
    const entities: Record<string, any> = {};
    for (const entity of result) {
      entities[entity.name] = entity;
    }

    return {
      entities: entities,
      fields: {},
      blocks: [],
    };
  } catch (error) {
    console.error("Failed to load admin data:", error);
    // Return empty data so the app can still function
    return { entities: {}, fields: {}, blocks: [] };
  }
}

/**
 * Get all forms or filter by criteria
 */
export async function getForms(
  params: Record<string, any> = {},
): Promise<AfformGetResult[]> {
  return await window.CRM.api4("Afform", "get", params);
}

/**
 * Get a specific form by name
 */
export async function getForm(name: string): Promise<AfformGetResult | null> {
  const results = await window.CRM.api4("Afform", "get", {
    where: [["name", "=", name]],
    layoutFormat: "shallow",
  });
  return results[0] || null;
}

/**
 * Save a form (create or update)
 * Uses Afform.save with records format (same as afform admin)
 */
export async function saveForm(params: AfformSaveParams): Promise<any> {
  try {
    // Use Afform.save with records format (matches afform admin behavior)
    const result = await window.CRM.api4("Afform", "save", {
      formatWhitespace: true,
      records: [params],
    });
    return result;
  } catch (error: any) {
    const errorMsg =
      error?.error_message ||
      error?.message ||
      error?.statusText ||
      (typeof error === "string" ? error : "Unknown server error");
    throw new Error(errorMsg);
  }
}

/**
 * Create a new form
 */
export async function createForm(params: AfformSaveParams): Promise<any> {
  return await window.CRM.api4("Afform", "create", {
    values: params,
  });
}

/**
 * Update an existing form
 */
export async function updateForm(
  name: string,
  params: Partial<AfformSaveParams>,
): Promise<any> {
  return await window.CRM.api4("Afform", "update", {
    where: [["name", "=", name]],
    values: params,
  });
}

/**
 * Delete a form
 */
export async function deleteForm(name: string): Promise<any> {
  return await window.CRM.api4("Afform", "delete", {
    where: [["name", "=", name]],
  });
}

/**
 * Get entity fields for a given entity
 */
export async function getEntityFields(
  entityName: string,
): Promise<Record<string, any>> {
  const result = await window.CRM.api4(entityName, "getFields", {
    loadOptions: ["id", "label"],
    where: [["type", "!=", "Extra"]],
  });

  const fields: Record<string, any> = {};
  result.forEach((field: any) => {
    fields[field.name] = field;
  });

  return fields;
}
