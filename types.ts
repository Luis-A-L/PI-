export interface Institution {
  id: string; // UUID
  name: string;
  cnpj: string;
  created_at: string;
}

export interface Profile {
  id: string; // UUID, references auth.users
  institution_id: string; // References institutions
  full_name: string;
  role: 'admin' | 'staff';
}

// Sub-types for dynamic tables in PIA
export interface FamilyMember {
  name: string;
  kinship: string; // Parentesco
  birth_date: string;
  education_level: string;
  job: string; // Formação Profissional
  occupation: string;
  income: string;
}

export interface ReferenceContact {
  name: string;
  phone: string;
  relationship: string;
  address: string;
}

export interface SiblingInCare {
  name: string;
  location: string;
  date: string;
}

export interface PreviousAdmission {
  institution_name: string;
  entry_date: string;
  exit_date: string;
  motive: string;
}

export interface ChildPhoto {
  id: string;
  child_id: string;
  url: string;
  created_at: string;
}

export interface ChildNote {
  id: string;
  child_id: string;
  institution_id: string;
  content: string;
  created_at: string;
}

export interface HealthTreatment {
  treatment: string;
  local: string;
  frequency: string;
  medication: string;
}

export interface Commitment {
  commitment: string;
  responsible: string;
  network: string; // Rede Socioassistencial
  deadline: string; // Prazo
  expected_results: string;
  obtained_results: string;
}

export interface Child {
  id: string; // UUID
  institution_id: string;
  
  // 1. Identificação
  full_name: string;
  birth_date: string;
  naturalness: string;
  uf: string;
  sex: 'M' | 'F';
  mother_name: string;
  father_name: string;
  filiation_destituted: boolean; // [opcional] à (destituídos)
  autos_number: string;
  forum_vara: string; // Foro Central, CIC, etc.
  
  // Documentação
  birth_certificate: string;
  cpf: string;
  reference_contacts: ReferenceContact[];

  // 2. Acolhimento
  first_admission: boolean;
  entry_date: string;
  transferred_from: string;
  transferred_date: string;
  responsible_organ: string;
  cnj_guide: string;
  reference_professional: string; // Vara da Infância
  fas_guide: string;
  
  // Motivos (Checkboxes stored as JSON or simple boolean flags, simplified to string array or text for MVP)
  admission_reason_types: string[]; // Violência, Rua, Abuso, etc.
  admission_reason_other: string;
  
  guardianship_council: string;
  counselor_name: string;
  previous_admissions: boolean;
  previous_admissions_local: string;
  previous_admissions_history: PreviousAdmission[];

  // 3. Vulnerabilidades
  socio_educational_measure: boolean;
  socio_educational_measure_type: string; // LA, Prestação Serviço
  death_threats: boolean;
  ppcaam_evaluated: boolean;
  ppcaam_inserted: boolean;
  ppcaam_justification: string;
  street_situation: boolean;

  // 4. Características Físicas
  race_color: string;
  hair_color: string;
  eye_color: string;
  physical_others: string; // Cicatrizes, etc.

  // 5. Situação Familiar
  family_type: string; // Biológica, Substituta, Extensa
  family_composition: FamilyMember[]; // JSONB
  responsible_family: string; // Pai e Mãe, Avós, etc.
  siblings_in_care: boolean;
  siblings_details: SiblingInCare[];

  // 5.2 Habitacional
  housing_condition: string; // Própria, Alugada...
  construction_type: string; // Alvenaria, Madeira...
  housing_water: boolean;
  housing_sewage: boolean;
  housing_light: boolean;

  // 5.3 Vínculo
  visits_received: string[]; // Pais, Mãe, Avós...
  visits_frequency: string;
  return_perspective: string; // Sim, Não, Em análise
  family_bond_exists: boolean;
  weekend_with_family: boolean;
  destituted_power: string; // Sim, Não, Em análise

  // 5.4 Rede Socioassistencial
  cras_monitoring: string; // Qual?
  creas_monitoring: string; // Qual?
  health_unit_monitoring: string; // Qual?
  protection_network_monitoring: string; // Qual?
  mandatory_notifications: boolean;
  referrals: string; // Encaminhamentos

  // 6. Saúde
  disabilities: string[]; // Mental, Visual, etc.
  needs_perm_care: boolean;
  health_others: string;
  cid: string;
  health_followup: string;
  health_treatments: HealthTreatment[]; // JSONB
  chemical_dependency: boolean;
  drugs_used: string[];
  dependency_treatment: boolean;
  health_obs: string;

  // 7. Educacional
  school_status: string; // Estuda, Não estuda...
  education_level: string; // Fundamental, Médio...
  school_type: string; // Especial, EJA...
  school_name: string;
  school_address: string;
  school_phone: string;

  // 8. Trabalho
  work_insertion: string; // Não se aplica ou SIM (Qual)

  // 9-11 Campos de Texto
  sports_leisure: string;
  historical_context: string;
  current_situation: string;

  // 12. Compromissos
  commitments: Commitment[]; // JSONB

  // 13. Final
  final_considerations: string;
  
  // Meta
  notes?: string; // Legacy field, kept for compatibility
  pia_status?: 'draft' | 'completed';
  created_at: string;
}

export interface TechnicalReport {
  id: string;
  child_id: string;
  institution_id: string;
  report_date: string;
  
  summary: string;
  evolution: string;
  health_status: string;
  family_situation: string;
  referrals: string;
  conclusion: string;
  
  status: 'draft' | 'finalized';
  created_at: string;
  updated_at: string;
}

export interface CommunityPost {
  id: string;
  institution_id: string;
  author_id: string;
  title: string;
  content: string;
  category: 'general' | 'donation' | 'question' | 'alert';
  created_at: string;
  // Joined fields (optional)
  profiles?: { full_name: string };
  institutions?: { name: string };
}

export interface CommunityComment {
  id: string;
  post_id: string;
  institution_id: string;
  author_id: string;
  content: string;
  created_at: string;
  // Joined fields
  profiles?: { full_name: string };
  institutions?: { name: string };
}

export type Database = {
  public: {
    Tables: {
      institutions: {
        Row: Institution;
        Insert: Omit<Institution, 'id' | 'created_at'>;
        Update: Partial<Omit<Institution, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Profile;
        Update: Partial<Profile>;
      };
      children: {
        Row: Child;
        Insert: Omit<Child, 'id' | 'created_at'>;
        Update: Partial<Omit<Child, 'id' | 'created_at'>>;
      };
      technical_reports: {
        Row: TechnicalReport;
        Insert: Omit<TechnicalReport, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TechnicalReport, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
};