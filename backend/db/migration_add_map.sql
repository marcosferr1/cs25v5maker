-- Migration to add map column to matches table
-- Run this script to add the map column to existing matches table

ALTER TABLE matches ADD COLUMN IF NOT EXISTS map TEXT DEFAULT 'Unknown';
