/*
  # Improve data consistency and add validation checks
  
  1. Changes
    - Create ON UPDATE trigger for pdf_files.updated_at
    - Add data integrity constraints to pdf_processing_logs
    - Prevent duplicate PDF uploads
    - Add malicious content detection flag handling
  
  2. Security
    - Add better validation for processing logs
    - Ensure cross-reference integrity
    - Add constraints for critical operations
*/

-- Create function to validate PDF processing logs
CREATE OR REPLACE FUNCTION validate_pdf_processing_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure there's a valid PDF attached
  IF NOT EXISTS (SELECT 1 FROM pdf_files WHERE id = NEW.pdf_id) THEN
    RAISE EXCEPTION 'Invalid pdf_id: %. No such PDF exists', NEW.pdf_id;
  END IF;
  
  -- Ensure pdf status is valid
  IF NEW.status NOT IN ('validation', 'processing', 'completion', 'error', 'status_change') THEN
    RAISE EXCEPTION 'Invalid log status: %', NEW.status;
  END IF;
  
  -- Ensure processor is specified
  IF NEW.processor IS NULL OR NEW.processor = '' THEN
    RAISE EXCEPTION 'Processor must be specified';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for PDF processing log validation
CREATE TRIGGER validate_pdf_processing_log_trigger
  BEFORE INSERT
  ON pdf_processing_logs
  FOR EACH ROW
  EXECUTE FUNCTION validate_pdf_processing_log();

-- Improve update_updated_at_timestamp to handle both tables
DROP TRIGGER IF EXISTS update_pdf_files_updated_at ON pdf_files;

CREATE TRIGGER update_pdf_files_updated_at
  BEFORE UPDATE
  ON pdf_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

-- Create index for pdf_processing_logs ordering
CREATE INDEX IF NOT EXISTS pdf_processing_logs_created_at_idx 
  ON pdf_processing_logs (created_at);

-- Create function to prevent duplicate PDFs
CREATE OR REPLACE FUNCTION prevent_duplicate_pdf()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_exists boolean;
BEGIN
  -- Check if PDF with same hash already exists for this user
  SELECT EXISTS (
    SELECT 1 FROM pdf_files
    WHERE file_hash = NEW.file_hash
    AND uploader_id = NEW.uploader_id
    AND id != NEW.id  -- Skip current record on updates
  ) INTO duplicate_exists;
  
  IF duplicate_exists THEN
    RAISE EXCEPTION 'A duplicate PDF already exists for this user';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to prevent duplicate PDFs
CREATE TRIGGER prevent_duplicate_pdf_trigger
  BEFORE INSERT OR UPDATE OF file_hash
  ON pdf_files
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_pdf();

-- Create function to check if PDF status change is valid
CREATE OR REPLACE FUNCTION validate_pdf_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Valid status transitions
  IF (OLD.status = 'pending' AND NEW.status NOT IN ('validating', 'rejected', 'failed')) THEN
    RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
  ELSIF (OLD.status = 'validating' AND NEW.status NOT IN ('processing', 'rejected', 'failed')) THEN
    RAISE EXCEPTION 'Invalid status transition from validating to %', NEW.status;
  ELSIF (OLD.status = 'processing' AND NEW.status NOT IN ('completed', 'failed')) THEN
    RAISE EXCEPTION 'Invalid status transition from processing to %', NEW.status;
  ELSIF (OLD.status = 'completed' AND NEW.status NOT IN ('processing', 'failed')) THEN
    RAISE EXCEPTION 'Invalid status transition from completed to %', NEW.status;
  END IF;
  
  -- If status is changing to 'failed', ensure there's an error message
  IF NEW.status = 'failed' AND NEW.error_message IS NULL THEN
    RAISE EXCEPTION 'Error message is required when setting status to failed';
  END IF;
  
  -- If status is changing to 'rejected' and is_malicious is NULL, set it to true
  IF NEW.status = 'rejected' AND NEW.is_malicious IS NULL THEN
    NEW.is_malicious = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for PDF status change validation
CREATE TRIGGER validate_pdf_status_change_trigger
  BEFORE UPDATE OF status
  ON pdf_files
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_pdf_status_change();