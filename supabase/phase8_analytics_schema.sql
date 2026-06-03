-- Phase 8: Analytics, Governance, Intelligence & Ecosystem Monitoring
-- Creating tables for analytics snapshots and governance

-- Governance Logs (Higher-level compliance ledger)
CREATE TABLE IF NOT EXISTS governance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(255) NOT NULL, -- e.g., 'MANUAL_OVERRIDE', 'STARTUP_APPROVED', 'CERTIFICATE_REVOKED'
    entity_type VARCHAR(255) NOT NULL, -- e.g., 'organization', 'mentor', 'certificate'
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- the admin/manager who performed it
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ecosystem Analytics Snapshots (For monthly/quarterly reports)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(255) NOT NULL, -- e.g., 'total_startups', 'graduated_startups', 'active_mentors'
    metric_value NUMERIC NOT NULL,
    dimension VARCHAR(255), -- e.g., 'Domain', 'Location', 'Stage'
    dimension_value VARCHAR(255), -- e.g., 'MedTech', 'Visakhapatnam', 'MVP'
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Executive Reports (Stored generated reports)
CREATE TABLE IF NOT EXISTS executive_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type VARCHAR(50) NOT NULL, -- 'Monthly', 'Quarterly', 'Annual'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    data_payload JSONB NOT NULL,
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: Instead of storing physical tables for dynamic metrics (like MentorImpactMetrics, DomainAnalytics, etc.), 
-- we will calculate them in real-time using backend API queries or Materialized Views to ensure accuracy,
-- and store point-in-time snapshots in `analytics_snapshots`.

-- Enable RLS
ALTER TABLE governance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_reports ENABLE ROW LEVEL SECURITY;

-- Governance Logs Policies
-- Admins can read all governance logs
CREATE POLICY "Admins can view all governance logs" 
ON governance_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role_id = (SELECT id FROM roles WHERE name = 'Admin')
  )
);

-- Analytics Snapshots Policies
-- Admins and Managers can view analytics
CREATE POLICY "Staff can view analytics snapshots" 
ON analytics_snapshots FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role_id IN (SELECT id FROM roles WHERE name IN ('Admin', 'Manager'))
  )
);

-- Executive Reports Policies
-- Only Admins can view/generate executive reports
CREATE POLICY "Admins can manage executive reports" 
ON executive_reports FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role_id = (SELECT id FROM roles WHERE name = 'Admin')
  )
);
