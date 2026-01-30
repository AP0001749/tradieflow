-- Lead automation system for TradieFlow
-- Core tables: business_profile, leads, lead_events

-- ============================================
-- 1. business_profile table
-- ============================================
CREATE TABLE IF NOT EXISTS business_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    service_area_postcodes TEXT[] DEFAULT '{}',
    default_job_types TEXT[] DEFAULT '{}',
    reply_to_email TEXT,
    booking_url_slug TEXT UNIQUE,
    google_review_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One profile per user
CREATE UNIQUE INDEX business_profile_user_id_idx ON business_profile(user_id);

-- Enable RLS
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own business profile"
    ON business_profile FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business profile"
    ON business_profile FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business profile"
    ON business_profile FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- 2. leads table
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
    source TEXT DEFAULT 'book_page',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'booked', 'won', 'lost', 'stale')),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    suburb TEXT,
    postcode TEXT,
    job_type TEXT,
    preferred_date DATE,
    preferred_time_window TEXT,
    notes TEXT,
    last_contacted_at TIMESTAMPTZ,
    next_followup_at TIMESTAMPTZ,
    followup_step INTEGER DEFAULT 0 CHECK (followup_step >= 0 AND followup_step <= 3),
    converted_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX leads_business_status_idx ON leads(business_id, status);
CREATE INDEX leads_next_followup_idx ON leads(next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX leads_business_created_idx ON leads(business_id, created_at DESC);
CREATE INDEX leads_converted_job_idx ON leads(converted_job_id) WHERE converted_job_id IS NOT NULL;

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see leads for their business
CREATE POLICY "Users can view leads for their business"
    ON leads FOR SELECT
    USING (
        business_id IN (
            SELECT id FROM business_profile WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert leads for their business"
    ON leads FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT id FROM business_profile WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update leads for their business"
    ON leads FOR UPDATE
    USING (
        business_id IN (
            SELECT id FROM business_profile WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete leads for their business"
    ON leads FOR DELETE
    USING (
        business_id IN (
            SELECT id FROM business_profile WHERE user_id = auth.uid()
        )
    );

-- Public insert policy for /book page (no auth required)
CREATE POLICY "Anonymous users can create leads"
    ON leads FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 3. lead_events table (audit log)
-- ============================================
CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'email_sent', 'status_changed', 'converted', 'followup_scheduled', 'error')),
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying events by lead
CREATE INDEX lead_events_lead_id_idx ON lead_events(lead_id, created_at DESC);

-- Enable RLS
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see events for their leads
CREATE POLICY "Users can view events for their leads"
    ON lead_events FOR SELECT
    USING (
        lead_id IN (
            SELECT l.id FROM leads l
            INNER JOIN business_profile bp ON l.business_id = bp.id
            WHERE bp.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert lead events"
    ON lead_events FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 4. Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_profile_updated_at
    BEFORE UPDATE ON business_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Function to schedule initial follow-up
-- ============================================
CREATE OR REPLACE FUNCTION schedule_initial_followup()
RETURNS TRIGGER AS $$
BEGIN
    -- Schedule immediate follow-up (step 1) for new leads
    IF NEW.status = 'new' AND NEW.email IS NOT NULL THEN
        NEW.next_followup_at = NOW();
        NEW.followup_step = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schedule_initial_followup
    BEFORE INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION schedule_initial_followup();

-- ============================================
-- 6. Grant permissions
-- ============================================
GRANT ALL ON business_profile TO authenticated;
GRANT ALL ON leads TO authenticated;
GRANT ALL ON leads TO anon; -- For public booking page
GRANT ALL ON lead_events TO authenticated;
GRANT ALL ON lead_events TO anon; -- For system cron
