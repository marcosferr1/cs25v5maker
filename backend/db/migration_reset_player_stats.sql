-- Migration to reset player stats for fresh data entry
-- This will reset all existing players to have zero stats

UPDATE players SET 
  games = 0,
  wins = 0,
  loses = 0,
  draws = 0,
  total_kills = 0,
  total_deaths = 0,
  kd = 0,
  total_damage = 0,
  ave_kills = 0,
  ave_deaths = 0,
  ave_damage = 0;

-- Add any missing players from the list with zero stats
INSERT INTO players (name, games, wins, loses, draws, total_kills, total_deaths, kd, total_damage, ave_kills, ave_deaths, ave_damage)
VALUES
('Tatin', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Payo', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Epocc', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Maito', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Jupy', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Motero', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Barrio', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Pabloski', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Samsam', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('BTO', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Bala', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Limon', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Rowa', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Esteban', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Santi', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Ale', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Gabriel', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Gero', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
('Ivan', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (name) DO NOTHING;
