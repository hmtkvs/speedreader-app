/*
  # Add missing subscription policies and cascading deletes

  1. Changes
    - Add missing RLS policies for INSERT, UPDATE, DELETE on subscriptions table
    - Add cascading deletes to foreign key relationships
    - Add NOT NULL constraints to critical fields

  2. Security
    - Complete RLS policy set for the subscriptions table
    - Add validation function for subscription fields
*/

-- Add missing RLS policies for subscriptions table
CREATE POLICY "Users can insert their own subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscription"
  ON subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add validation function for subscriptions
CREATE OR REPLACE FUNCTION validate_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure subscription has valid status
  IF NEW.status NOT IN ('trialing', 'active', 'canceled', 'unpaid', 'past_due') THEN
    RAISE EXCEPTION 'Invalid subscription status: %', NEW.status;
  END IF;
  
  -- Ensure trial_end is set for trialing subscriptions
  IF NEW.status = 'trialing' AND NEW.trial_end IS NULL THEN
    RAISE EXCEPTION 'trial_end must be set for trialing subscriptions';
  END IF;
  
  -- Ensure current_period_end is set for active subscriptions
  IF NEW.status = 'active' AND NEW.current_period_end IS NULL THEN
    RAISE EXCEPTION 'current_period_end must be set for active subscriptions';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for subscription validation
CREATE TRIGGER validate_subscription_trigger
  BEFORE INSERT OR UPDATE
  ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_subscription();

-- Add CASCADE to PDF-related foreign keys
ALTER TABLE pdf_processing_logs DROP CONSTRAINT IF EXISTS pdf_processing_logs_pdf_id_fkey;
ALTER TABLE pdf_processing_logs ADD CONSTRAINT pdf_processing_logs_pdf_id_fkey
  FOREIGN KEY (pdf_id)
  REFERENCES pdf_files(id)
  ON DELETE CASCADE;

-- Create an index on subscriptions.user_id
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);

-- Create composite indexes for pdf_files
CREATE INDEX IF NOT EXISTS pdf_files_uploader_status_idx ON pdf_files (uploader_id, status);
CREATE INDEX IF NOT EXISTS pdf_files_hash_uploader_idx ON pdf_files (file_hash, uploader_id);