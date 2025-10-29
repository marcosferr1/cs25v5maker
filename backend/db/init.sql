-- Initialize schema for CS2 5v5 tracker
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  loses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  kd NUMERIC DEFAULT 0,
  total_damage INTEGER DEFAULT 0,
  ave_kills NUMERIC DEFAULT 0,
  ave_deaths NUMERIC DEFAULT 0,
  ave_damage INTEGER DEFAULT 0
);

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

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  map_id INTEGER REFERENCES maps(id) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS match_players (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  team INTEGER NOT NULL, -- 1 or 2
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  headshot_percentage NUMERIC DEFAULT 0,
  damage INTEGER DEFAULT 0,
  result TEXT -- 'win', 'loss', 'draw'
);

-- Seed sample players (empty stats, ready for data entry)
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
