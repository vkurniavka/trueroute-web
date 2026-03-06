-- 0001_initial.sql
-- Initial D1 schema for TrueRoute multi-country data API.
-- Tables: countries, regions, region_files.

-- Countries (ISO 3166-1 alpha-2)
CREATE TABLE countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_uk TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_countries_code ON countries(code);

-- Regions within a country
CREATE TABLE regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL REFERENCES countries(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_uk TEXT NOT NULL
);

CREATE INDEX idx_regions_country_id ON regions(country_id);

-- Downloadable files for each region
CREATE TABLE region_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id INTEGER NOT NULL REFERENCES regions(id),
  file_type TEXT NOT NULL CHECK(file_type IN ('maps', 'geocode', 'poi', 'routing')),
  url TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
  generated_at TEXT NOT NULL
);

CREATE INDEX idx_region_files_region_id ON region_files(region_id);
