// Core form element types
export interface FormElement {
  "#tag": string;
  "#children"?: FormElement[];
  id?: string;
  name?: string;
  defn?: Record<string, any>;
  actions?: {
    create?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  "af-fieldset"?: string;
  "af-title"?: string;
  class?: string;
  [key: string]: any;
}

// Afform metadata
export interface AfformMetadata {
  name: string;
  title: string;
  description?: string;
  type?: string;
  server_route?: string;
  requires?: string[];
  entity_type?: string;
  is_dashlet?: boolean;
  is_public?: boolean;
  is_token?: boolean;
  permission?: string;
  redirect?: string;
}

// Entity configuration for the form
export interface EntityConfig {
  type: string;
  name: string;
  label?: string;
  data?: {
    source?: string;
    [key: string]: any;
  };
  actions: {
    create?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  security?: string;
}

// Entity definition from APIv4
export interface EntityDefinition {
  name: string;
  title: string;
  title_plural: string;
  description?: string;
  type: string[];
  icon?: string;
  dao?: string;
  bridge?: any;
  table_name?: string;
  label_field?: string;
  searchable?: string;
  order_by?: string;
  primary_key: string[];
  paths?: Record<string, string>;
}

// Field definition from APIv4
export interface FieldDefinition {
  name: string;
  title?: string;
  description?: string;
  type: string;
  data_type?: string;
  input_type?: string;
  input_attrs?: Record<string, any>;
  required?: boolean;
  default_value?: any;
  options?: Array<{ id: string | number; label: string }>;
  fk_entity?: string;
  serialize?: number;
  nullable?: boolean;
  readonly?: boolean;
  operators?: string[];
}

// Palette item for drag-drop
export interface PaletteItem {
  id: string;
  label: string;
  category: string;
  icon?: string;
  element: FormElement;
}

// API responses
export interface AdminData {
  entities: Record<string, EntityDefinition>;
  fields: Record<string, Record<string, FieldDefinition>>;
  blocks: any[];
}

export interface AfformGetResult {
  name: string;
  layout: FormElement[];
  [key: string]: any;
}

export interface AfformSaveParams {
  name: string;
  layout?: FormElement[];
  title?: string;
  description?: string;
  [key: string]: any;
}
