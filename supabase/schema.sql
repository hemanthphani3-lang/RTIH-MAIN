-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Users Profile (extends auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Domains
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Organizations (Startup entity)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    founder_id UUID REFERENCES user_profiles(id),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    solution TEXT NOT NULL,
    website VARCHAR(255),
    stage VARCHAR(50) NOT NULL,
    primary_domain_id UUID REFERENCES domains(id),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Organization Secondary Domains
CREATE TABLE organization_domains (
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    PRIMARY KEY (org_id, domain_id)
);

-- Organization Members (Co-Founders)
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL, -- if registered
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    role VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Mentors
CREATE TABLE mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id),
    max_capacity INT DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Managers
CREATE TABLE managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES user_profiles(id),
    document_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Mentorship Assignments
CREATE TABLE mentorship_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Verification Requests
CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    level INT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES user_profiles(id)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    read_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(100),
    entity_id UUID,
    performed_by UUID REFERENCES user_profiles(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Insert Roles
INSERT INTO roles (name) VALUES ('Organization'), ('Mentor'), ('Manager'), ('Admin') ON CONFLICT DO NOTHING;

-- Insert Domains (Examples)
INSERT INTO domains (name) VALUES ('AI'), ('EV'), ('AgriTech'), ('HealthTech'), ('FinTech'), ('EdTech') ON CONFLICT DO NOTHING;

-- ========================================================
-- PHASE 2: STARTUP LIFECYCLE ENGINE
-- ========================================================

-- Startup Stages
CREATE TABLE startup_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    sequence INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Milestones
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID REFERENCES startup_stages(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Milestone Submissions
CREATE TABLE milestone_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Draft', -- Draft, Submitted, Approved, Rejected
    notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Milestone Reviews (by Mentors)
CREATE TABLE milestone_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES milestone_submissions(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES user_profiles(id),
    outcome VARCHAR(50) NOT NULL, -- Approved, Rejected, Clarification Requested
    comments TEXT NOT NULL,
    review_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Action Items (Mentor Task Tracking)
CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES user_profiles(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Completed
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Stage Transitions (Progression Engine & Manual Promotion)
CREATE TABLE stage_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    previous_stage UUID REFERENCES startup_stages(id),
    new_stage UUID REFERENCES startup_stages(id),
    transition_type VARCHAR(50) NOT NULL, -- automatic, manual
    promoted_by UUID REFERENCES user_profiles(id),
    notes TEXT,
    transition_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Activity Timeline
CREATE TABLE activity_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event VARCHAR(255) NOT NULL,
    description TEXT,
    actor UUID REFERENCES user_profiles(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Startup Status History (Venture Health indicator)
CREATE TABLE startup_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    updated_by UUID REFERENCES user_profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
