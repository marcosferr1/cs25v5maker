-- Migration script to add maps table and update matches table
-- Run this script to migrate existing database

-- Create maps table
CREATE TABLE IF NOT EXISTS maps (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

-- Insert CS2 maps
INSERT INTO maps (name, display_name) VALUES 
  ('dust2', 'Dust 2'),
  ('nuke', 'Nuke'),
  ('inferno', 'Inferno'),
  ('mirage', 'Mirage'),
  ('ancient', 'Ancient'),
  ('overpass', 'Overpass'),
  ('train', 'Train'),
  ('anubis', 'Anubis'),
  ('vertigo', 'Vertigo')
ON CONFLICT (name) DO NOTHING;

-- Add map_id column to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS map_id INTEGER REFERENCES maps(id) DEFAULT 1;

-- Update existing matches to use Dust 2 as default map
UPDATE matches SET map_id = 1 WHERE map_id IS NULL;
