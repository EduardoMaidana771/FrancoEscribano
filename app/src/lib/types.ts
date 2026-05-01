export interface Profile {
  id: string;
  full_name: string;
  email: string;
  next_matriz_number: number;
  next_folio_number: number;
  city: string;
  notary_name: string;
  notary_initials: string;
  paper_series_proto: string;
  paper_number_proto: string;
  paper_series_testimony: string;
  paper_numbers_testimony: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  full_name: string;
  ci_number: string | null;
  nationality: string;
  birth_date: string | null;
  birth_place: string | null;
  civil_status: "soltero" | "casado" | "divorciado" | "viudo" | "separado_bienes";
  gender: "M" | "F" | null;
  civil_status_detail: string | null;
  nupcias_type: "unicas" | "primeras" | "segundas" | "terceras" | null;
  spouse_name: string | null;
  divorce_ficha: string | null;
  divorce_year: string | null;
  divorce_court: string | null;
  address: string | null;
  department: string;
  phone: string | null;
  is_company: boolean;
  company_name: string | null;
  company_type: string | null;
  rut: string | null;
  company_registry_number: string | null;
  company_registry_folio: string | null;
  company_registry_book: string | null;
  company_business_purpose: string | null;
  company_law_19484: boolean;
  representative_name: string | null;
  representative_ci: string | null;
  representative_role: string | null;
  representative_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  brand: string | null;
  brand_dgr_id: string | null;
  model: string | null;
  model_dgr_id: string | null;
  year: number | null;
  type: string | null;
  type_dgr_id: string | null;
  fuel: string;
  fuel_dgr_id: string | null;
  cylinders: number | null;
  motor_number: string | null;
  chassis_number: string | null;
  plate: string | null;
  padron: string | null;
  padron_department: string | null;
  national_code: string | null;
  affectation: string;
  owner_name: string | null;
  owner_ci: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  seller_id: string | null;
  seller2_id: string | null;
  buyer_id: string | null;
  buyer2_id: string | null;
  vehicle_id: string | null;
  seller_has_representative: boolean;
  seller_representative_name: string | null;
  seller_representative_ci: string | null;
  seller_representative_address: string | null;
  seller_representative_power_date: string | null;
  seller_representative_power_notary: string | null;
  seller_representative_power_protocol_date: string | null;
  seller_representative_power_type: string | null;
  seller_representative_can_substitute: boolean;
  buyer_has_representative: boolean;
  buyer_representative_name: string | null;
  buyer_representative_ci: string | null;
  buyer_representative_address: string | null;
  buyer_representative_power_date: string | null;
  buyer_representative_power_notary: string | null;
  buyer_representative_power_protocol_date: string | null;
  buyer_representative_power_type: string | null;
  buyer_representative_can_substitute: boolean;
  price_amount: number | null;
  price_currency: string;
  price_in_words: string | null;
  payment_type: "contado" | "saldo_precio" | "transferencia_bancaria" | "letra_cambio" | "mixto" | "cesion_tercero";
  payment_detail: string | null;
  payment_installments_count: number | null;
  payment_installment_amount: number | null;
  payment_installment_dates: string | null;
  payment_cash_amount: number | null;
  payment_bank_name: string | null;
  payment_third_party_name: string | null;
  payment_third_party_ci: string | null;
  bps_status: "no" | "si" | "no_controlado";
  irae_status: "no" | "si" | "no_controlado";
  imeba_status: "no" | "si" | "no_controlado";
  bps_cert_number: string | null;
  bps_cert_date: string | null;
  cud_number: string | null;
  cud_date: string | null;
  previous_owner_name: string | null;
  previous_title_date: string | null;
  previous_title_notary: string | null;
  previous_title_same_notary: boolean;
  previous_title_registry: string | null;
  previous_title_number: string | null;
  previous_title_registry_date: string | null;
  previous_title_type: string | null;
  previous_title_is_first_registration: boolean;
  insurance_policy_number: string | null;
  insurance_company: string | null;
  insurance_expiry: string | null;
  insurance_separate_cert: boolean;
  has_plate_history: boolean;
  plate_history_entries: string | null;
  election_declaration: string | null;
  has_traffic_responsibility_clause: boolean;
  traffic_responsibility_date: string | null;
  matriz_number: number | null;
  folio_start: number | null;
  folio_end: number | null;
  folio_end_is_vuelto: boolean;
  previous_matriz_number: number | null;
  previous_matriz_type: string | null;
  previous_matriz_folio_start: number | null;
  previous_matriz_folio_end: number | null;
  paper_series_proto: string | null;
  paper_number_proto: string | null;
  paper_series_testimony: string | null;
  paper_numbers_testimony: string | null;
  protocolization_date: string | null;
  transaction_date: string;
  status: "borrador" | "completado";
  folder_name: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  seller?: Client;
  seller2?: Client;
  buyer?: Client;
  buyer2?: Client;
  vehicle?: Vehicle;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  transaction_id: string | null;
  created_at: string;
}

export interface FileRecord {
  id: string;
  user_id: string;
  folder_id: string | null;
  transaction_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  extracted_data: Record<string, unknown> | null;
  uploaded_at: string;
  expires_at: string | null;
}

export interface ExtractedPersonData {
  full_name?: string;
  ci_number?: string;
  nationality?: string;
  birth_date?: string;
  birth_place?: string;
  civil_status?: string;
  gender?: "M" | "F" | null;
  address?: string;
  department?: string;
}

export interface ExtractedVehicleData {
  brand?: string;
  model?: string;
  year?: number;
  type?: string;
  fuel?: string;
  cylinders?: number;
  motor_number?: string;
  chassis_number?: string;
  plate?: string;
  padron?: string;
  padron_department?: string;
  owner_name?: string;
  owner_ci?: string;
}

export interface ExtractedPowerPartyData {
  full_name?: string;
  ci_number?: string;
  rut?: string;
  gender?: "M" | "F" | null;
  address?: string;
  kind?: "person" | "company";
  role?: string;
}

export interface ExtractedCartaPoderData {
  poderdante?: ExtractedPowerPartyData;
  apoderado?: ExtractedPowerPartyData;
  poderdantes?: ExtractedPowerPartyData[];
  apoderados?: ExtractedPowerPartyData[];
  power_type?: string;
  power_date?: string;
  notary?: string;
  can_substitute?: boolean;
}

export interface ExtractedTextData {
  persons?: Array<
    ExtractedPersonData & {
      role?: string;
      phone?: string;
      civil_status_detail?: string;
      nupcias_type?: "unicas" | "primeras" | "segundas" | "terceras";
      spouse_name?: string;
      is_company?: boolean;
      company_name?: string;
      company_type?: string;
      rut?: string;
    }
  >;
  vehicles?: ExtractedVehicleData[];
  price?: {
    amount?: number;
    currency?: string;
    in_words?: string;
  };
  transaction?: {
    transaction_date?: string;
    payment_type?: string;
    payment_detail?: string;
    bps_status?: string;
    irae_status?: string;
    imeba_status?: string;
    previous_owner_name?: string;
    previous_title_date?: string;
    previous_title_notary?: string;
    previous_title_registry?: string;
    previous_title_number?: string;
    previous_title_registry_date?: string;
    insurance_policy_number?: string;
    insurance_company?: string;
    insurance_expiry?: string;
  };
}

// ── DGR ──────────────────────────────────────────────────────

export interface DgrSession {
  id: string;
  user_id: string;
  cookies: {
    GX_CLIENT_ID: string;
    GX_SESSION_ID: string;
    JSESSIONID: string;
    ROUTEID: string;
    GxTZOffset: string;
  };
  status: "active" | "expired";
  dgr_ci: string | null;
  created_at: string;
  updated_at: string;
}

export interface DgrCacheEntry {
  id: string;
  user_id: string;
  cache_key: string;
  data: unknown;
  fetched_at: string;
}
