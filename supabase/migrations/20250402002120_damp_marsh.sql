/*
  # Update subscriptions table with NOT NULL constraints
  
  1. Changes
    - Add NOT NULL constraints to required columns
    - Create a validation trigger for subscription data
    - Add cascading operations
  
  2. Security
    - Ensure data integrity for critical subscription operations
    - Validate changes to subscription status
*/

-- Add NOT NULL constraints to critical columns
ALTER TABLE subscriptions 
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN plan_id SET NOT NULL;

-- Create function to validate subscription status changes
CREATE OR REPLACE FUNCTION validate_subscription_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Valid status transitions
  IF (OLD.status = 'trialing' AND NEW.status NOT IN ('active', 'canceled', 'past_due')) THEN
    RAISE EXCEPTION 'Invalid status transition from trialing to %', NEW.status;
  ELSIF (OLD.status = 'active' AND NEW.status NOT IN ('canceled', 'past_due', 'unpaid')) THEN
    RAISE EXCEPTION 'Invalid status transition from active to %', NEW.status;
  ELSIF (OLD.status = 'past_due' AND NEW.status NOT IN ('active', 'canceled', 'unpaid')) THEN
    RAISE EXCEPTION 'Invalid status transition from past_due to %', NEW.status;
  END IF;
  
  -- If status is changing to 'active', ensure current_period_end is set
  IF NEW.status = 'active' AND NEW.current_period_end IS NULL THEN
    RAISE EXCEPTION 'current_period_end is required when setting status to active';
  END IF;
  
  -- If status is changing to 'trialing', ensure trial_end is set
  IF NEW.status = 'trialing' AND NEW.trial_end IS NULL THEN
    RAISE EXCEPTION 'trial_end is required when setting status to trialing';
  END IF;
  
  -- If status is changing to 'canceled', ensure cancel_at is set
  IF NEW.status = 'canceled' AND NEW.cancel_at IS NULL THEN
    NEW.cancel_at = CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for subscription status change validation
CREATE TRIGGER validate_subscription_status_change_trigger
  BEFORE UPDATE OF status
  ON subscriptions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_subscription_status_change();

-- Add comment to subscription policy
COMMENT ON POLICY "Users can view own subscription" ON subscriptions
IS 'Allows users to view only their own subscription records';

COMMENT ON POLICY "Users can insert their own subscription" ON subscriptions
IS 'Allows users to create subscription records for themselves only';

COMMENT ON POLICY "Users can update own subscription" ON subscriptions
IS 'Allows users to update only their own subscription details';

COMMENT ON POLICY "Users can delete own subscription" ON subscriptions
IS 'Allows users to delete only their own subscription';

-- Add cascading delete for user relationship (when a user is deleted)
-- This should be done at the user management level, but we include this for completeness
DO $$
BEGIN
  -- Check if there's a foreign key constraint first
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subscriptions_user_id_fkey' 
    AND table_name = 'subscriptions'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_user_id_fkey;
    
    -- Add it back with CASCADE
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;