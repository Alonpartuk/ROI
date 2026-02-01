-- ============================================
-- Octup Dashboard Users Table
-- ============================================
-- Run this SQL in BigQuery Console to create the users table
-- Project: octup-testing
-- Dataset: hubspot_data
-- ============================================

-- Create the users table for authentication
CREATE TABLE IF NOT EXISTS `octup-testing.hubspot_data.dashboard_users` (
  email STRING NOT NULL,
  password_hash STRING NOT NULL,
  name STRING,
  needs_password_change BOOL DEFAULT TRUE,
  is_active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  last_login_at TIMESTAMP
);

-- Insert initial admin user (alon@octup.com) - password will be hashed in application
-- The default password 'Octup2026!' should be hashed by the application
-- This is just a placeholder for structure

-- Insert existing users (these will need proper password hashes)
-- You can run the application's seed endpoint to create these properly
-- INSERT INTO `octup-testing.hubspot_data.dashboard_users` (email, password_hash, name, needs_password_change)
-- VALUES
--   ('alon@octup.com', '<hash>', 'Alon', FALSE),
--   ('hagai@octup.com', '<hash>', 'Hagai', FALSE),
--   ('dror@octup.com', '<hash>', 'Dror', FALSE);

-- ============================================
-- Notes:
-- - password_hash stores bcrypt hashed passwords
-- - needs_password_change: TRUE for new users who must set their own password
-- - is_active: FALSE to disable user without deleting
-- - Admin access is determined by email = 'alon@octup.com' in application code
-- ============================================
