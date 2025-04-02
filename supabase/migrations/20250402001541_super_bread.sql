/*
  # Update PDF constraints and add validation functions

  1. Changes
    - Add NOT NULL constraints to critical fields in pdf_files table
    - Create constraint check functions for file validation
    - Add file size constraint check

  2. Security
    - Better validation of input data
    - Stronger constraints on critical fields
*/

-- Add file size constraint check
ALTER TABLE pdf_files ADD CONSTRAINT check_file_size 
  CHECK (file_size <= 10485760); -- 10MB limit

-- Create a function to validate PDF files
CREATE OR REPLACE FUNCTION validate_pdf_file()
RETURNS TRIGGER AS $$
BEGIN
  -- Check mime type
  IF NEW.mime_type != 'application/pdf' THEN
    RAISE EXCEPTION 'Invalid mime type: %. Only PDF files are allowed.', NEW.mime_type;
  END IF;
  
  -- Validate file name
  IF NEW.file_name IS NULL OR LENGTH(NEW.file_name) < 1 THEN
    RAISE EXCEPTION 'File name is required';
  END IF;
  
  -- Validate file hash
  IF NEW.file_hash IS NULL OR LENGTH(NEW.file_hash) < 10 THEN
    RAISE EXCEPTION 'Valid file hash is required';
  END IF;
  
  -- Additional validations could be added here
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for PDF file validation
CREATE TRIGGER validate_pdf_file_trigger
  BEFORE INSERT OR UPDATE
  ON pdf_files
  FOR EACH ROW
  EXECUTE FUNCTION validate_pdf_file();

-- Create function to log PDF status changes
CREATE OR REPLACE FUNCTION log_pdf_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO pdf_processing_logs (
      pdf_id, status, message, processor, details
    ) VALUES (
      NEW.id,
      'status_change',
      format('PDF status changed from %s to %s', OLD.status, NEW.status),
      'system',
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for logging PDF status changes
CREATE TRIGGER log_pdf_status_change_trigger
  AFTER UPDATE OF status
  ON pdf_files
  FOR EACH ROW
  EXECUTE FUNCTION log_pdf_status_change();

-- Optimize queries by adding a partial index for completed PDFs
CREATE INDEX IF NOT EXISTS pdf_files_completed_idx 
  ON pdf_files (uploader_id) 
  WHERE status = 'completed';