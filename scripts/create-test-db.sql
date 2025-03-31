-- Script to create the test database
CREATE DATABASE IF NOT EXISTS task_db_test;

-- Grant privileges (adjust as needed for your environment)
GRANT ALL PRIVILEGES ON task_db_test.* TO 'root'@'localhost';
FLUSH PRIVILEGES;