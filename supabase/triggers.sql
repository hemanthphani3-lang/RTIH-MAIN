-- 1. Trigger for New Application Submitted (Manager Notification + Audit Log)
CREATE OR REPLACE FUNCTION on_application_submitted()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert (brand new org)
  IF NEW.status = 'Pending' THEN
    -- Audit Log
    INSERT INTO audit_logs (action, entity, entity_id, performed_by, timestamp)
    VALUES ('Application Submitted', 'organizations', NEW.id, NEW.founder_id, now());

    -- Find managers in the same domain to notify
    INSERT INTO notifications (user_id, title, description)
    SELECT user_id, 'New Application Submitted', 'Startup ' || NEW.name || ' has submitted an application for review.'
    FROM managers WHERE domain_id = NEW.primary_domain_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER application_submitted_trigger
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION on_application_submitted();

-- 2. Trigger for Application Approved / Rejected (Organization Notification + Audit Log)
CREATE OR REPLACE FUNCTION on_verification_updated()
RETURNS TRIGGER AS $$
DECLARE
  v_founder_id UUID;
  v_org_name VARCHAR;
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('Approved', 'Rejected') THEN
    SELECT founder_id, name INTO v_founder_id, v_org_name FROM organizations WHERE id = NEW.organization_id;
    
    -- Audit Log
    INSERT INTO audit_logs (action, entity, entity_id, performed_by, timestamp)
    VALUES ('Application ' || NEW.status, 'verification_requests', NEW.id, auth.uid(), now());

    -- Notify Founder
    INSERT INTO notifications (user_id, title, description)
    VALUES (v_founder_id, 'Application ' || NEW.status, 'Your application for ' || v_org_name || ' has been ' || NEW.status || '.');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verification_updated_trigger
AFTER UPDATE ON verification_requests
FOR EACH ROW EXECUTE FUNCTION on_verification_updated();

-- 3. Trigger for Mentor Assigned (Mentor & Org Notification + Audit Log)
CREATE OR REPLACE FUNCTION on_mentor_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_founder_id UUID;
  v_org_name VARCHAR;
  v_mentor_user_id UUID;
BEGIN
  SELECT founder_id, name INTO v_founder_id, v_org_name FROM organizations WHERE id = NEW.organization_id;
  SELECT user_id INTO v_mentor_user_id FROM mentors WHERE id = NEW.mentor_id;

  -- Audit Log
  INSERT INTO audit_logs (action, entity, entity_id, performed_by, timestamp)
  VALUES ('Mentor Assigned', 'mentorship_assignments', NEW.id, auth.uid(), now());

  -- Notify Organization
  INSERT INTO notifications (user_id, title, description)
  VALUES (v_founder_id, 'Mentor Assigned', 'A mentor has been assigned to your startup ' || v_org_name || '.');

  -- Notify Mentor
  INSERT INTO notifications (user_id, title, description)
  VALUES (v_mentor_user_id, 'Organization Assigned', 'You have been assigned to mentor ' || v_org_name || '.');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mentor_assigned_trigger
AFTER INSERT ON mentorship_assignments
FOR EACH ROW EXECUTE FUNCTION on_mentor_assigned();

-- Ensure users can read their own notifications and admins can read audit logs
CREATE POLICY "Users can read their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read audit logs" ON audit_logs FOR SELECT USING (true); -- (Open for MVP dashboard)
