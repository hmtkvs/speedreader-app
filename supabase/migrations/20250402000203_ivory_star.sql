/*
  # PDF Storage and Validation System

  1. New Tables
    - `pdf_files` - Stores PDF files and their metadata
      - `id` (uuid, primary key)
      - `file_name` (text) - Original file name
      - `file_size` (bigint) - Size in bytes
      - `file_hash` (text) - SHA-256 hash
      - `mime_type` (text) - MIME type
      - `uploader_id` (uuid) - References auth.users
      - `status` (text) - Current processing status
      - `version` (integer) - Version number (starting at 1)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `original_file_url` (text) - URL to original file in storage
      - `processed_file_url` (text) - URL to processed/optimized file

    - `pdf_processing_logs` - Tracks processing history for each PDF
      - `id` (uuid, primary key)
      - `pdf_id` (uuid) - References pdf_files
      - `status` (text) - Processing status
      - `message` (text) - Status message or error
      - `processor` (text) - Processing component identifier
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for appropriate access controls
    - Ensure only authenticated users can upload files

  3. Indexes
    - Index on file_hash for duplicate detection
    - Index on uploader_id for user-based queries
    - Index on status for filtering by processing state
*/

-- Create enum for PDF processing statuses
DO $$ BEGIN
  CREATE TYPE pdf_status AS ENUM (
    'pending',
    'validating',
    'processing',
    'completed',
    'failed',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create PDF files table
CREATE TABLE IF NOT EXISTS pdf_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_hash text NOT NULL,
  mime_type text NOT NULL,
  uploader_id uuid REFERENCES auth.users NOT NULL,
  status pdf_status NOT NULL DEFAULT 'pending',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  original_file_url text,
  processed_file_url text,
  metadata jsonb,
  error_message text,
  page_count integer,
  is_malicious boolean DEFAULT false,
  word_count integer
);

-- Create processing logs table
CREATE TABLE IF NOT EXISTS pdf_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id uuid REFERENCES pdf_files NOT NULL,
  status text NOT NULL,
  message text,
  processor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  details jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS pdf_files_file_hash_idx ON pdf_files (file_hash);
CREATE INDEX IF NOT EXISTS pdf_files_uploader_id_idx ON pdf_files (uploader_id);
CREATE INDEX IF NOT EXISTS pdf_files_status_idx ON pdf_files (status);
CREATE INDEX IF NOT EXISTS pdf_processing_logs_pdf_id_idx ON pdf_processing_logs (pdf_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_pdf_files_updated_at
BEFORE UPDATE ON pdf_files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_timestamp();

-- Enable RLS
ALTER TABLE pdf_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_processing_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pdf_files
CREATE POLICY "Allow users to view their own PDF files" 
  ON pdf_files 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = uploader_id);

CREATE POLICY "Allow users to insert their own PDF files" 
  ON pdf_files 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Allow users to update their own PDF files" 
  ON pdf_files 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = uploader_id);

CREATE POLICY "Allow users to delete their own PDF files" 
  ON pdf_files 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = uploader_id);

-- Create RLS policies for pdf_processing_logs
CREATE POLICY "Allow users to view logs for their own PDF files" 
  ON pdf_processing_logs 
  FOR SELECT 
  TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM pdf_files 
    WHERE pdf_files.id = pdf_processing_logs.pdf_id 
    AND pdf_files.uploader_id = auth.uid()
  ));

-- Create function to log PDF processing events
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
BEGIN
  INSERT INTO pdf_processing_logs (
    pdf_id, status, message, processor, details
  ) VALUES (
    pdf_id_param, status_param, message_param, processor_param, details_param
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create function to check for duplicate PDFs
CREATE OR REPLACE FUNCTION is_duplicate_pdf(
  file_hash_param text,
  uploader_id_param uuid
)
RETURNS boolean AS $$
DECLARE
  duplicate_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pdf_files
    WHERE file_hash = file_hash_param
    AND uploader_id = uploader_id_param
  ) INTO duplicate_exists;
  
  RETURN duplicate_exists;
END;
$$ language 'plpgsql' SECURITY DEFINER;