-- Departmental intake (service + sub-category) for enrollment routing.
-- Relaxes legacy condition_type CHECK so new values can be stored if needed.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS department_service_id TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS department_subcategory_id TEXT;

COMMENT ON COLUMN patients.department_service_id IS 'Enrollment: departmental service (e.g. outpatient, maternity)';
COMMENT ON COLUMN patients.department_subcategory_id IS 'Enrollment: sub-category under the departmental service';

ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_condition_type_check;
