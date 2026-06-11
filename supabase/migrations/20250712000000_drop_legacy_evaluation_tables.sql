-- Legacy evaluation cleanup (DO NOT RUN until approved in production).
-- evaluation_cycles is intentionally preserved for the new performance system.

DROP TABLE IF EXISTS evaluation_responses;
DROP TABLE IF EXISTS employee_evaluations;
DROP TABLE IF EXISTS evaluation_templates;
