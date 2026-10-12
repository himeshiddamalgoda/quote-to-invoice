-- Local integration tests use a separate database.
CREATE DATABASE IF NOT EXISTS quote_flow_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON quote_flow_test.* TO 'quote_flow'@'%';
