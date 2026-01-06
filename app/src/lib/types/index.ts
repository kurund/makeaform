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

// Afform metadata - includes all fields to preserve when editing existing forms
export interface AfformMetadata {
  name: string;
  title: string;
  type?: string;
  description?: string | null;
  icon?: string | null;
  server_route?: string;
  permission?: string[] | null;
  permission_operator?: string | null;
  placement?: any[] | null;
  placement_filters?: any[] | null;
  placement_weight?: number | null;
  submit_enabled?: boolean;
  create_submission?: boolean;
  submit_limit?: number | null;
  confirmation_type?: string | null;
  confirmation_message?: string | null;
  redirect?: string | null;
  is_public?: boolean;
  requires?: string[] | null;
  entity_type?: string | null;
  join_entity?: string | null;
  tags?: any[] | null;
  manual_processing?: boolean | null;
  allow_verification_by_email?: boolean | null;
  email_confirmation_template_id?: number | null;
  autosave_draft?: boolean | null;
  navigation?: any | null;
  // Additional fields that may exist
  [key: string]: any;
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

// Join entity definition (Email, Phone, Address, etc.)
export interface JoinEntity {
  name: string;
  label: string;
  icon?: string | null;
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
  joins?: JoinEntity[];  // Available join entities for this entity type
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
