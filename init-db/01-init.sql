-- Initialize JumpApp database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE jumpapp TO jumpapp_user;

-- Log initialization
\echo 'JumpApp database initialized successfully!'
