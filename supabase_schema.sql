-- =================================================================
-- SCHEMA: Curitiba Acolhe MVP (Atualizado PIA Completo)
-- AUTHOR: Senior Software Architect
-- =================================================================

-- 1. Create Institutions Table
CREATE TABLE public.institutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cnpj TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Profiles Table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    institution_id UUID REFERENCES public.institutions(id) NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create Children Table (Campos COMPLETOS do PIA)
CREATE TABLE public.children (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID REFERENCES public.institutions(id) NOT NULL,
    
    -- 1. Identificação
    full_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    naturalness TEXT,
    uf VARCHAR(2),
    sex VARCHAR(1),
    filiation TEXT,
    filiation_destituted BOOLEAN DEFAULT false,
    autos_number TEXT,
    forum_vara TEXT,
    birth_certificate TEXT,
    cpf TEXT,
    reference_contacts TEXT,

    -- 2. Acolhimento
    entry_date DATE NOT NULL,
    transferred_from TEXT,
    transferred_date DATE,
    responsible_organ TEXT,
    cnj_guide TEXT,
    reference_professional TEXT,
    fas_guide TEXT,
    admission_reason_types JSONB, -- Array de strings
    admission_reason_other TEXT,
    guardianship_council TEXT,
    counselor_name TEXT,
    previous_admissions BOOLEAN,
    previous_admissions_local TEXT,

    -- 3. Vulnerabilidades
    socio_educational_measure BOOLEAN,
    socio_educational_measure_type TEXT,
    death_threats BOOLEAN,
    ppcaam_evaluated BOOLEAN,
    ppcaam_inserted BOOLEAN,
    ppcaam_justification TEXT,
    street_situation BOOLEAN,

    -- 4. Físicas
    race_color TEXT,
    hair_color TEXT,
    eye_color TEXT,
    physical_others TEXT,

    -- 5. Familiar
    family_type TEXT,
    family_composition JSONB, -- Tabela 5.1
    responsible_family TEXT,
    siblings_in_care BOOLEAN,
    siblings_details TEXT,
    
    -- 5.2 Habitacional
    housing_condition TEXT,
    construction_type TEXT,
    housing_water BOOLEAN,
    housing_sewage BOOLEAN,
    housing_light BOOLEAN,
    
    -- 5.3 Vínculo
    visits_received JSONB, -- Array strings
    visits_frequency TEXT,
    return_perspective TEXT,
    family_bond_exists BOOLEAN,
    weekend_with_family BOOLEAN,
    destituted_power TEXT,
    
    -- 5.4 Rede
    cras_monitoring TEXT,
    creas_monitoring TEXT,
    health_unit_monitoring TEXT,
    protection_network_monitoring TEXT,
    mandatory_notifications BOOLEAN,
    referrals TEXT,

    -- 6. Saúde
    disabilities JSONB,
    needs_perm_care BOOLEAN,
    health_others TEXT,
    cid TEXT,
    health_followup TEXT,
    health_treatments JSONB, -- Tabela Medicamentos
    chemical_dependency BOOLEAN,
    drugs_used JSONB,
    dependency_treatment BOOLEAN,
    health_obs TEXT,

    -- 7. Educacional
    school_status TEXT,
    education_level TEXT,
    school_type TEXT,
    school_name TEXT,
    school_address TEXT,
    school_phone TEXT,

    -- 8. Trabalho
    work_insertion TEXT,

    -- 9-11 Texto Livre
    sports_leisure TEXT,
    historical_context TEXT,
    current_situation TEXT,

    -- 12. Compromissos
    commitments JSONB, -- Tabela

    -- 13. Final
    final_considerations TEXT,
    
    -- Legacy / Meta
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Technical Reports
CREATE TABLE public.technical_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES public.children(id) NOT NULL,
    institution_id UUID REFERENCES public.institutions(id) NOT NULL,
    report_date DATE NOT NULL,
    summary TEXT,
    evolution TEXT,
    health_status TEXT,
    family_situation TEXT,
    referrals TEXT,
    conclusion TEXT,
    status TEXT CHECK (status IN ('draft', 'finalized')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_reports ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for re-run)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view their own institution" ON public.institutions FOR SELECT USING (id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Institutions manage their own children" ON public.children FOR ALL TO authenticated USING (institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Institutions manage their own reports" ON public.technical_reports FOR ALL TO authenticated USING (institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid()));
