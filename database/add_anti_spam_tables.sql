-- Add anti-spam and rate limiting tables

-- Table to track flagged accounts for manual review
CREATE TABLE IF NOT EXISTS account_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending_review',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track signup attempts for rate limiting (optional - for server-side tracking)
CREATE TABLE IF NOT EXISTS signup_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET,
    email TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track suspicious patterns
CREATE TABLE IF NOT EXISTS security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'rapid_signup', 'suspicious_email', 'multiple_accounts'
    details JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_account_flags_user_id ON account_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_account_flags_status ON account_flags(status);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip ON signup_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_email ON signup_attempts(email);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_attempted_at ON signup_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- Enable RLS on all tables
ALTER TABLE account_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for account_flags
CREATE POLICY "Users can view their own flags" ON account_flags
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all flags" ON account_flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "System can insert flags" ON account_flags
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update flags" ON account_flags
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for signup_attempts (admin only)
CREATE POLICY "Admins can view signup attempts" ON signup_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "System can insert signup attempts" ON signup_attempts
    FOR INSERT WITH CHECK (true);

-- RLS Policies for security_events
CREATE POLICY "Users can view their own security events" ON security_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security events" ON security_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "System can insert security events" ON security_events
    FOR INSERT WITH CHECK (true);

-- Function to clean up old signup attempts (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_signup_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM signup_attempts 
    WHERE attempted_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rate limit status for an IP
CREATE OR REPLACE FUNCTION check_ip_rate_limit(check_ip INET, time_window INTERVAL DEFAULT '1 hour', max_attempts INTEGER DEFAULT 5)
RETURNS BOOLEAN AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO attempt_count
    FROM signup_attempts
    WHERE ip_address = check_ip
    AND attempted_at > NOW() - time_window;
    
    RETURN attempt_count < max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get suspicious account count by email pattern
CREATE OR REPLACE FUNCTION check_email_pattern_abuse(email_pattern TEXT, time_window INTERVAL DEFAULT '1 day', max_accounts INTEGER DEFAULT 3)
RETURNS BOOLEAN AS $$
DECLARE
    account_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO account_count
    FROM profiles
    WHERE email ILIKE email_pattern
    AND created_at > NOW() - time_window;
    
    RETURN account_count < max_accounts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
