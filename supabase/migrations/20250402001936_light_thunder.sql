/*
  # Fix security definer functions and add NOT NULL constraints

  1. Changes
    - Replace SECURITY DEFINER functions with safer SECURITY INVOKER alternatives
    - Add missing NOT NULL constraints to critical columns
    - Improve function error handling

  2. Security
    - Removes privilege escalation risks
    - Ensures data integrity through proper constraints
*/

-- Drop and recreate log_pdf_processing function without SECURITY DEFINER
DROP FUNCTION IF EXISTS log_pdf_processing;

CREATE OR REPLACE FUNCTION log_pdf_processing(
  pdf_id_param uuid,
  status_param text,
  message_param text,
  processor_param text,
  details_param jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
  owner_id uuid;
BEGIN
  -- First verify the user owns this PDF
  SELECT uploader_id INTO owner_id
  FROM pdf_files
  WHERE id = pdf_id_param;

  -- Ensure the user can only log for PDFs they own
  IF owner_id IS NULL OR owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to log events for this PDF';
  END IF;

  INSERT INTO pdf_processing_logs (
    pdf_id, status, message, processor, details
  ) VALUES (
    pdf_id_param, status_param, message_param, processor_param, details_param
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ language 'plpgsql'; -- Removed SECURITY DEFINER

-- Drop and recreate is_duplicate_pdf function without SECURITY DEFINER
DROP FUNCTION IF EXISTS is_duplicate_pdf;

CREATE OR REPLACE FUNCTION is_duplicate_pdf(
  file_hash_param text,
  uploader_id_param uuid
)
RETURNS boolean AS $$
DECLARE
  duplicate_exists boolean;
BEGIN
  -- This function doesn't need elevated privileges
  -- It only checks for duplicates for the current user
  SELECT EXISTS (
    SELECT 1 FROM pdf_files
    WHERE file_hash = file_hash_param
    AND uploader_id = uploader_id_param
  ) INTO duplicate_exists;
  
  RETURN duplicate_exists;
END;
$$ language 'plpgsql'; -- Removed SECURITY DEFINER

-- Add NOT NULL constraints to nullable columns that shouldn't be null
ALTER TABLE pdf_files 
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN file_name SET NOT NULL,
  ALTER COLUMN file_size SET NOT NULL,
  ALTER COLUMN file_hash SET NOT NULL,
  ALTER COLUMN mime_type SET NOT NULL,
  ALTER COLUMN uploader_id SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Add NOT NULL constraints to processing logs
ALTER TABLE pdf_processing_logs
  ALTER COLUMN pdf_id SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN processor SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- Modify update_updated_at_timestamp function to be safer
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.created_at = COALESCE(NEW.created_at, now());
    NEW.updated_at = COALESCE(NEW.updated_at, now());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';