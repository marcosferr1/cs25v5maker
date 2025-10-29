-- Migration to add missing players with zero stats
-- This will only add players that don't exist yet

INSERT INTO players (name, games, wins, loses, draws, total_kills, total_deaths, kd, total_damage, ave_kills, ave_deaths, ave_damage)
SELECT * FROM (VALUES
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
) AS new_players(name, games, wins, loses, draws, total_kills, total_deaths, kd, total_damage, ave_kills, ave_deaths, ave_damage)
WHERE NOT EXISTS (SELECT 1 FROM players WHERE players.name = new_players.name);
