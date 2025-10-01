-- Registrations Schema for Scout App
-- This schema supports comprehensive registration management for groups

-- Main registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Basic Info
  registration_type VARCHAR(50) NOT NULL CHECK (registration_type IN ('season', 'clinic', 'camp', 'event', 'tournament')),
  name VARCHAR(255) NOT NULL,
  sport VARCHAR(100),
  
  -- Dates
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Location & Details
  location TEXT,
  description TEXT,
  additional_details TEXT,
  
  -- Capacity & Pricing
  max_registrations INTEGER,
  registration_fee DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Custom forms for registrations
CREATE TABLE IF NOT EXISTS registration_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Form fields (questions in custom forms)
CREATE TABLE IF NOT EXISTS registration_form_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'multiselect', 'checkbox', 'radio', 'date', 'number', 'email', 'phone')),
  label VARCHAR(255) NOT NULL,
  placeholder TEXT,
  is_required BOOLEAN DEFAULT false,
  options JSONB, -- For select, multiselect, radio, checkbox options
  validation_rules JSONB, -- Custom validation rules
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participant information fields
CREATE TABLE IF NOT EXISTS registration_participant_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  field_key VARCHAR(100) NOT NULL, -- e.g., 'tshirt', 'roommate', 'jersey', 'emergency', 'allergies', 'experience'
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  options JSONB, -- For dropdowns, etc.
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medical waivers and legal forms
CREATE TABLE IF NOT EXISTS registration_waivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  waiver_type VARCHAR(50) CHECK (waiver_type IN ('medical', 'liability', 'photo_release', 'code_of_conduct', 'custom')),
  is_required BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PDF attachments
CREATE TABLE IF NOT EXISTS registration_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  file_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional purchase items
CREATE TABLE IF NOT EXISTS registration_optional_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  max_quantity INTEGER,
  is_available BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom fields/customizations
CREATE TABLE IF NOT EXISTS registration_custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'checkbox', 'toggle', 'date', 'number')),
  label VARCHAR(255) NOT NULL,
  placeholder TEXT,
  options JSONB, -- For select, checkbox options
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registration submissions (actual registrations from participants)
CREATE TABLE IF NOT EXISTS registration_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Payment info
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
  payment_method VARCHAR(50),
  payment_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  
  -- Metadata
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(registration_id, user_id)
);

-- Submission responses (answers to forms and fields)
CREATE TABLE IF NOT EXISTS registration_submission_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES registration_submissions(id) ON DELETE CASCADE,
  field_id UUID, -- Can reference form_fields, participant_fields, or custom_fields
  field_type VARCHAR(50) NOT NULL, -- 'form_field', 'participant_field', 'custom_field'
  response_value JSONB NOT NULL, -- Flexible storage for any type of response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waiver signatures
CREATE TABLE IF NOT EXISTS registration_waiver_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES registration_submissions(id) ON DELETE CASCADE,
  waiver_id UUID NOT NULL REFERENCES registration_waivers(id) ON DELETE CASCADE,
  signature_data TEXT, -- Base64 encoded signature image or text signature
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  
  UNIQUE(submission_id, waiver_id)
);

-- Optional item purchases
CREATE TABLE IF NOT EXISTS registration_item_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES registration_submissions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES registration_optional_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_registrations_group_id ON registrations(group_id);
CREATE INDEX idx_registrations_created_by ON registrations(created_by);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_dates ON registrations(start_date, end_date);

CREATE INDEX idx_registration_forms_registration_id ON registration_forms(registration_id);
CREATE INDEX idx_registration_form_fields_form_id ON registration_form_fields(form_id);
CREATE INDEX idx_registration_participant_fields_registration_id ON registration_participant_fields(registration_id);
CREATE INDEX idx_registration_waivers_registration_id ON registration_waivers(registration_id);
CREATE INDEX idx_registration_attachments_registration_id ON registration_attachments(registration_id);
CREATE INDEX idx_registration_optional_items_registration_id ON registration_optional_items(registration_id);
CREATE INDEX idx_registration_custom_fields_registration_id ON registration_custom_fields(registration_id);

CREATE INDEX idx_registration_submissions_registration_id ON registration_submissions(registration_id);
CREATE INDEX idx_registration_submissions_user_id ON registration_submissions(user_id);
CREATE INDEX idx_registration_submissions_status ON registration_submissions(status);
CREATE INDEX idx_registration_submission_responses_submission_id ON registration_submission_responses(submission_id);
CREATE INDEX idx_registration_waiver_signatures_submission_id ON registration_waiver_signatures(submission_id);
CREATE INDEX idx_registration_item_purchases_submission_id ON registration_item_purchases(submission_id);

-- RLS Policies

-- Registrations: Group members can view, leaders can create/edit
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view registrations for their groups"
  ON registrations FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE player_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can create registrations"
  ON registrations FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    group_id IN (
      SELECT id FROM groups WHERE leader_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can update their registrations"
  ON registrations FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE leader_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can delete their registrations"
  ON registrations FOR DELETE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE leader_id = auth.uid()
    )
  );

-- Similar RLS policies for related tables
ALTER TABLE registration_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_participant_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_optional_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_custom_fields ENABLE ROW LEVEL SECURITY;

-- Allow group leaders to manage all registration-related data
CREATE POLICY "Group leaders can manage registration forms"
  ON registration_forms FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can manage form fields"
  ON registration_form_fields FOR ALL
  USING (
    form_id IN (
      SELECT rf.id FROM registration_forms rf
      JOIN registrations r ON rf.registration_id = r.id
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can manage participant fields"
  ON registration_participant_fields FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can manage waivers"
  ON registration_waivers FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can manage attachments"
  ON registration_attachments FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can manage optional items"
  ON registration_optional_items FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can manage custom fields"
  ON registration_custom_fields FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

-- Submissions: Users can view/create their own, leaders can view all
ALTER TABLE registration_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own submissions"
  ON registration_submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Group leaders can view all submissions for their registrations"
  ON registration_submissions FOR SELECT
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

CREATE POLICY "Users can create submissions"
  ON registration_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own submissions"
  ON registration_submissions FOR UPDATE
  USING (user_id = auth.uid());

-- Submission responses
ALTER TABLE registration_submission_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage responses for their submissions"
  ON registration_submission_responses FOR ALL
  USING (
    submission_id IN (
      SELECT id FROM registration_submissions WHERE user_id = auth.uid()
    )
  );

-- Waiver signatures
ALTER TABLE registration_waiver_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage signatures for their submissions"
  ON registration_waiver_signatures FOR ALL
  USING (
    submission_id IN (
      SELECT id FROM registration_submissions WHERE user_id = auth.uid()
    )
  );

-- Item purchases
ALTER TABLE registration_item_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage purchases for their submissions"
  ON registration_item_purchases FOR ALL
  USING (
    submission_id IN (
      SELECT id FROM registration_submissions WHERE user_id = auth.uid()
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registration_submissions_updated_at
  BEFORE UPDATE ON registration_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
