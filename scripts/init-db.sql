CREATE USER waparuser WITH PASSWORD 'wapar-user';
GRANT ALL ON SCHEMA public to waparuser;
CREATE DATABASE wapardev;
-- TODO: set waparuser as owner of wapardev;
GRANT ALL PRIVILEGES ON DATABASE wapardev TO waparuser;
-- TOOD: run below as waparuser on wapardev;
CREATE EXTENSION pgcrypto;
CREATE EXTENSION "uuid-ossp";