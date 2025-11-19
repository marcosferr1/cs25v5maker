require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Fuse = require('fuse.js');
const db = require('./db');

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Auth helpers
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
// You can set ADMIN_PASSWORD_HASH to a bcrypt hash; if not provided, use plain env ADMIN_PASSWORD
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || null;

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    if (username !== ADMIN_USERNAME) return res.status(401).json({ error: 'invalid credentials' });

    let ok = false;
    if (ADMIN_PASSWORD_HASH) {
      ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    } else {
      ok = password === ADMIN_PASSWORD;
    }
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = signToken({ sub: 'admin', role: 'admin', username: ADMIN_USERNAME });
    return res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'login failed' });
  }
});

// Routes
app.get('/api/players', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM players ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(503).json({ error: 'database unavailable' });
  }
});

app.post('/api/players', requireAuth, async (req, res) => {
  const { name, kd, total_damage } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  
  try {
  const result = await db.query(
      `INSERT INTO players (name, kd, total_damage) VALUES ($1, $2, $3) RETURNING *`,
      [name, kd || 0, total_damage || 0]
  );
  res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create player' });
  }
});

// Update player
app.put('/api/players/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, kd, total_damage } = req.body;
  
  if (!name) return res.status(400).json({ error: 'name required' });
  
  try {
    const result = await db.query(
      `UPDATE players SET name = $1, kd = $2, total_damage = $3 WHERE id = $4 RETURNING *`,
      [name, kd || 0, total_damage || 0, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'player not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to update player' });
  }
});

// Delete player
app.delete('/api/players/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(
      `DELETE FROM players WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'player not found' });
    }
    
    res.json({ message: 'player deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to delete player' });
  }
});

// Get all matches with player details
app.get('/api/matches', async (req, res) => {
  try {
    const matches = await db.query(`
      SELECT 
        m.id,
        m.created_at,
        m.map_id,
        map.display_name as map_name,
        COUNT(mp.id) as player_count
      FROM matches m
      LEFT JOIN maps map ON m.map_id = map.id
      LEFT JOIN match_players mp ON m.id = mp.match_id
      GROUP BY m.id, m.created_at, m.map_id, map.display_name
      ORDER BY m.created_at DESC
    `);
    
    res.json(matches.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch matches' });
  }
});

// Get match details with player stats
app.get('/api/matches/:id', async (req, res) => {
  try {
    const matchId = req.params.id;
    
    const matchDetails = await db.query(`
      SELECT 
        m.id,
        m.created_at,
        m.map_id,
        map.display_name as map_name,
        mp.team,
        p.id as player_id,
        p.name,
        mp.kills,
        mp.deaths,
        mp.assists,
        mp.headshot_percentage,
        mp.damage,
        mp.result
      FROM matches m
      LEFT JOIN maps map ON m.map_id = map.id
      JOIN match_players mp ON m.id = mp.match_id
      JOIN players p ON mp.player_id = p.id
      WHERE m.id = $1
      ORDER BY mp.team, p.name
    `, [matchId]);
    
    if (matchDetails.rows.length === 0) {
      return res.status(404).json({ error: 'match not found' });
    }
    
    // Group by teams
    const teams = {
      team1: matchDetails.rows.filter(row => row.team === 1),
      team2: matchDetails.rows.filter(row => row.team === 2)
    };
    
    res.json({
      id: matchDetails.rows[0].id,
      created_at: matchDetails.rows[0].created_at,
      map_id: matchDetails.rows[0].map_id,
      map_name: matchDetails.rows[0].map_name,
      teams
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch match details' });
  }
});

// Submit detailed match results
app.post('/api/matches', requireAuth, async (req, res) => {
  const { teams } = req.body; // { team1: [{id, team, kills, deaths, assists, headshot_percentage, damage, result}], team2: [...] }
  
  if (!teams || !teams.team1 || !teams.team2) {
    return res.status(400).json({ error: 'teams object with team1 and team2 arrays required' });
  }
  
  if (!Array.isArray(teams.team1) || !Array.isArray(teams.team2)) {
    return res.status(400).json({ error: 'team1 and team2 must be arrays' });
  }
  
  if (teams.team1.length !== 5 || teams.team2.length !== 5) {
    return res.status(400).json({ error: 'each team must have exactly 5 players' });
  }

  try {
    await db.pool.query('BEGIN');
    
    // Create match
    const matchRes = await db.query(
      `INSERT INTO matches (created_at, map_id) VALUES (now(), $1) RETURNING id`,
      [matchMapId || 1]
    );
    const matchId = matchRes.rows[0].id;

    // Process all players
    const allPlayers = [...teams.team1, ...teams.team2];
    
    for (const player of allPlayers) {
      // Convert team string to integer (team1 -> 1, team2 -> 2)
      const teamNumber = player.team === 'team1' ? 1 : 2;
      
      // Insert match player record
      await db.query(
        `INSERT INTO match_players (match_id, player_id, team, kills, deaths, assists, headshot_percentage, damage, result)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          matchId, 
          player.id, 
          teamNumber,
          player.kills || 0, 
          player.deaths || 0, 
          player.assists || 0,
          player.headshot_percentage || 0,
          player.damage || 0, 
          player.result || 'loss'
        ]
      );

      // Update aggregated player stats
      await db.query(
        `UPDATE players SET
           games = games + 1,
           wins = wins + CASE WHEN $2='win' THEN 1 ELSE 0 END,
           loses = loses + CASE WHEN $2='loss' THEN 1 ELSE 0 END,
           draws = draws + CASE WHEN $2='draw' THEN 1 ELSE 0 END,
           total_kills = total_kills + $3,
           total_deaths = total_deaths + $4,
           total_damage = total_damage + $5
         WHERE id = $1`,
        [
          player.id, 
          player.result, 
          player.kills || 0, 
          player.deaths || 0, 
          player.damage || 0
        ]
      );

      // Recompute averages and kd
      await db.query(
        `UPDATE players SET
           ave_kills = CASE WHEN games>0 THEN round(total_kills::numeric / games,1) ELSE 0 END,
           ave_deaths = CASE WHEN games>0 THEN round(total_deaths::numeric / games,1) ELSE 0 END,
           ave_damage = CASE WHEN games>0 THEN round(total_damage::numeric / games,0) ELSE 0 END,
           kd = CASE WHEN total_deaths>0 THEN round((total_kills::numeric / total_deaths),2) ELSE total_kills END
         WHERE id = $1`,
        [player.id]
      );
    }

    await db.pool.query('COMMIT');
    res.json({ ok: true, matchId, message: 'Match saved successfully' });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'failed to save match' });
  }
});

// Helper function to process CSV data (shared between file and text upload)
async function processCsvData(csvData) {

  // Validate CSV structure
  if (csvData.length === 0) {
    throw new Error('CSV is empty');
  }

  // Check required columns
  const requiredColumns = ['Team', 'Player', 'Kills', 'Deaths', 'Assists', 'HS%', 'DMG'];
  const csvColumns = Object.keys(csvData[0]);
  const missingColumns = requiredColumns.filter(col => !csvColumns.includes(col));
  
  // Check if Map column exists (optional)
  const hasMapColumn = csvColumns.includes('Map');
    
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Get all existing players for matching
  const existingPlayers = await db.query('SELECT * FROM players ORDER BY name');
  
  // Configure Fuse.js for fuzzy matching
  const fuse = new Fuse(existingPlayers.rows, {
    keys: ['name'],
    threshold: 0.2, // Lower threshold = more strict matching (was 0.3)
    includeScore: true
  });

  // Extract map from first row and normalize it
  let matchMapId = 1; // Default to Dust 2
  console.log('Map detection debug:');
  console.log('hasMapColumn:', hasMapColumn);
  console.log('csvData.length:', csvData.length);
  console.log('First row Map value:', csvData.length > 0 ? csvData[0].Map : 'No data');
  
  if (hasMapColumn && csvData.length > 0 && csvData[0].Map) {
    const mapName = csvData[0].Map.trim().toLowerCase();
    console.log('Original map name:', csvData[0].Map);
    console.log('Normalized map name:', mapName);
    
    // Map CSV map names to our database names
    const mapMapping = {
      'dust 2': 'dust2',
      'dust2': 'dust2',
      'nuke': 'nuke',
      'inferno': 'inferno',
      'mirage': 'mirage',
      'ancient': 'ancient',
      'overpass': 'overpass',
      'train': 'train',
      'anubis': 'anubis',
      'vertigo': 'vertigo'
    };
    
    const normalizedMapName = mapMapping[mapName] || 'dust2';
    console.log('Mapped map name:', normalizedMapName);
    
    // Get map ID from database
    const mapResult = await db.query('SELECT id FROM maps WHERE name = $1', [normalizedMapName]);
    console.log('Map query result:', mapResult.rows);
    if (mapResult.rows.length > 0) {
      matchMapId = mapResult.rows[0].id;
      console.log('Selected map ID:', matchMapId);
    } else {
      console.log('Map not found, using default ID 1');
    }
  } else {
    console.log('Using default map ID 1');
  }

  // Check if all players have both Win Point and Lose Point (draw scenario)
  const allHaveBothPoints = csvData.every(row => {
    const hasWinPoint = row['Win Point'] && row['Win Point'].trim() !== '';
    const hasLosePoint = row['Lose Point'] && row['Lose Point'].trim() !== '';
    return hasWinPoint && hasLosePoint;
  });
  
  // Process CSV data
  const processedData = [];
  const unmatchedPlayers = [];
  
  for (const row of csvData) {
    // Skip empty rows or rows with missing required data
    if (!row.Player || !row.Team || row.Player.trim() === '' || row.Team.trim() === '') {
      console.log('Skipping empty row:', row);
      continue;
    }
    
    const playerName = row.Player.trim();
    const teamName = row.Team.trim();
    
    // Try exact match first
    let matchedPlayer = existingPlayers.rows.find(p => 
      p.name.toLowerCase() === playerName.toLowerCase()
    );
    
    // If no exact match, try fuzzy matching
    if (!matchedPlayer) {
      const fuzzyResults = fuse.search(playerName);
      if (fuzzyResults.length > 0 && fuzzyResults[0].score < 0.2) {
        matchedPlayer = fuzzyResults[0].item;
      }
    }
    
    // Determine result based on Win Point and Lose Point
    let result = 'loss';
    if (allHaveBothPoints) {
      // If all players have both points, it's a draw
      result = 'draw';
    } else if (row['Win Point'] && row['Win Point'].trim() !== '') {
      result = 'win';
    } else if (row['Lose Point'] && row['Lose Point'].trim() !== '') {
      result = 'loss';
    }
    
    const playerData = {
      csvName: playerName,
      matchedPlayer: matchedPlayer,
      team: teamName,
      kills: parseInt(row.Kills) || 0,
      deaths: parseInt(row.Deaths) || 0,
      assists: parseInt(row.Assists) || 0,
      headshot_percentage: parseFloat(row['HS%']) || 0,
      damage: parseInt(row.DMG) || 0,
      result: result
    };
    
    if (matchedPlayer) {
      processedData.push({
        ...playerData,
        player_id: matchedPlayer.id,
        player_name: matchedPlayer.name
      });
    } else {
      unmatchedPlayers.push(playerData);
    }
  }

  // Validate we have exactly 10 players
  const totalPlayers = processedData.length + unmatchedPlayers.length;
  if (totalPlayers !== 10) {
    throw new Error(`Formato de CSV incorrecto: Se esperaban 10 jugadores pero se encontraron ${totalPlayers}. Verifica que el CSV tenga exactamente 10 filas de datos (sin contar el encabezado) y que no haya filas vacías.`);
  }

  // Validate teams
  const team1Players = [...processedData, ...unmatchedPlayers].filter(p => p.team === 'Team 1');
  const team2Players = [...processedData, ...unmatchedPlayers].filter(p => p.team === 'Team 2');
  
  if (team1Players.length !== 5 || team2Players.length !== 5) {
    throw new Error(`Formato de CSV incorrecto: Distribución de equipos inválida. Team 1 tiene ${team1Players.length} jugadores, Team 2 tiene ${team2Players.length} jugadores. Cada equipo debe tener exactamente 5 jugadores.`);
  }

  return {
    success: true,
    processedData: processedData,
    unmatchedPlayers: unmatchedPlayers,
    matchMapId: matchMapId,
    message: `Found ${processedData.length} matched players, ${unmatchedPlayers.length} unmatched players`
  };
}

// Upload CSV and process match data (from file)
app.post('/api/matches/upload-csv', requireAuth, upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  try {
    const csvData = [];
    
    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => csvData.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Process CSV data using shared function
    const result = await processCsvData(csvData);
    res.json(result);

  } catch (err) {
    console.error('Error processing CSV:', err);
    res.status(500).json({ error: `Failed to process CSV file: ${err.message}` });
  }
});

// Upload CSV and process match data (from text)
app.post('/api/matches/upload-csv-text', requireAuth, async (req, res) => {
  const { csvText } = req.body;
  
  if (!csvText || !csvText.trim()) {
    return res.status(400).json({ error: 'No CSV text provided' });
  }

  try {
    const csvData = [];
    
    // Parse CSV text (handles both comma and tab separators)
    await new Promise((resolve, reject) => {
      const lines = csvText.trim().split('\n').filter(line => line.trim()); // Remove empty lines
      if (lines.length === 0) {
        return reject(new Error('CSV text is empty'));
      }
      
      // Detect separator (comma or tab)
      const firstLine = lines[0];
      const hasTabs = firstLine.includes('\t');
      const separator = hasTabs ? '\t' : ',';
      
      // Get headers from first line
      const headers = firstLine.split(separator).map(h => h.trim());
      
      // Parse each data line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        // Split by detected separator
        const values = line.split(separator).map(v => v.trim());
        
        // Only process if we have at least some data
        if (values.length === 0 || (values.length === 1 && !values[0])) continue;
        
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        csvData.push(row);
      }
      
      resolve();
    });

    // Process CSV data using shared function
    const result = await processCsvData(csvData);
    res.json(result);

  } catch (err) {
    console.error('Error processing CSV text:', err);
    res.status(500).json({ error: `Failed to process CSV text: ${err.message}` });
  }
});

// Create match from processed CSV data
app.post('/api/matches/from-csv', requireAuth, async (req, res) => {
  const { processedData, unmatchedPlayers, newPlayers, matchMapId } = req.body;
  
  console.log('Creating match from CSV data:');
  console.log('processedData:', processedData?.length);
  console.log('unmatchedPlayers:', unmatchedPlayers?.length);
  console.log('newPlayers:', newPlayers?.length);
  console.log('matchMapId:', matchMapId);
  
  if (!processedData || !Array.isArray(processedData)) {
    return res.status(400).json({ error: 'processedData array required' });
  }

  try {
    await db.pool.query('BEGIN');
    
    // Create new players if any
    const createdPlayers = [];
    if (newPlayers && Array.isArray(newPlayers)) {
      for (const newPlayer of newPlayers) {
        // Find the player data from unmatchedPlayers to get their stats
        // Try exact match first, then case-insensitive match
        let playerData = unmatchedPlayers.find(p => p.csvName === newPlayer.originalCsvName);
        
        if (!playerData) {
          playerData = unmatchedPlayers.find(p => p.csvName.toLowerCase() === newPlayer.originalCsvName.toLowerCase());
        }
        
        console.log(`Creating new player: ${newPlayer.name}, originalCsvName: ${newPlayer.originalCsvName}`);
        console.log(`Available unmatchedPlayers:`, unmatchedPlayers.map(p => p.csvName));
        console.log(`Found playerData:`, playerData);
        
        if (!playerData) {
          throw new Error(`Player data not found for ${newPlayer.originalCsvName}. Available: ${unmatchedPlayers.map(p => p.csvName).join(', ')}`);
        }
        
        const result = await db.query(
          `INSERT INTO players (name, kd, total_damage, games, wins, loses, draws, total_kills, total_deaths, ave_kills, ave_deaths, ave_damage) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
          [
            newPlayer.name, 
            playerData.deaths > 0 ? (playerData.kills / playerData.deaths).toFixed(2) : playerData.kills,
            playerData.damage,
            1, // games
            playerData.result === 'win' ? 1 : 0, // wins
            playerData.result === 'loss' ? 1 : 0, // loses
            playerData.result === 'draw' ? 1 : 0, // draws
            playerData.kills, // total_kills
            playerData.deaths, // total_deaths
            playerData.kills, // ave_kills
            playerData.deaths, // ave_deaths
            playerData.damage  // ave_damage
          ]
        );
        createdPlayers.push(result.rows[0]);
      }
    }

    // Create match
    const matchRes = await db.query(
      `INSERT INTO matches (created_at, map_id) VALUES (now(), $1) RETURNING id`,
      [matchMapId || 1]
    );
    const matchId = matchRes.rows[0].id;

    // Combine all player data
    const allPlayerData = [
      ...processedData,
      ...unmatchedPlayers.map(p => {
        // Find if this player was created as new
        const newPlayer = newPlayers.find(np => np.originalCsvName === p.csvName);
        const createdPlayer = createdPlayers.find(cp => cp.name === newPlayer?.name);
        
        return {
          ...p,
          player_id: createdPlayer?.id,
          player_name: newPlayer?.name || p.csvName
        };
      })
    ];

    // Process all players
    for (const player of allPlayerData) {
      if (!player.player_id) {
        throw new Error(`Player ${player.csvName} not found or created`);
      }

      // Convert team string to integer
      const teamNumber = player.team === 'Team 1' ? 1 : 2;
      
      // Insert match player record
      await db.query(
        `INSERT INTO match_players (match_id, player_id, team, kills, deaths, assists, headshot_percentage, damage, result)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          matchId, 
          player.player_id, 
          teamNumber,
          player.kills, 
          player.deaths, 
          player.assists,
          player.headshot_percentage,
          player.damage, 
          player.result
        ]
      );

      // Check if this is a newly created player (already has stats from creation)
      const isNewPlayer = createdPlayers.some(cp => cp.id === player.player_id);
      
      if (!isNewPlayer) {
        // Update aggregated player stats only for existing players
        await db.query(
          `UPDATE players SET
             games = games + 1,
             wins = wins + CASE WHEN $2='win' THEN 1 ELSE 0 END,
             loses = loses + CASE WHEN $2='loss' THEN 1 ELSE 0 END,
             draws = draws + CASE WHEN $2='draw' THEN 1 ELSE 0 END,
             total_kills = total_kills + $3,
             total_deaths = total_deaths + $4,
             total_damage = total_damage + $5
           WHERE id = $1`,
          [
            player.player_id, 
            player.result, 
            player.kills, 
            player.deaths, 
            player.damage
          ]
        );

        // Recompute averages and kd for existing players
        await db.query(
          `UPDATE players SET
             ave_kills = CASE WHEN games>0 THEN round(total_kills::numeric / games,1) ELSE 0 END,
             ave_deaths = CASE WHEN games>0 THEN round(total_deaths::numeric / games,1) ELSE 0 END,
             ave_damage = CASE WHEN games>0 THEN round(total_damage::numeric / games,0) ELSE 0 END,
             kd = CASE WHEN total_deaths>0 THEN round((total_kills::numeric / total_deaths),2) ELSE total_kills END
           WHERE id = $1`,
          [player.player_id]
        );
      } else {
        // For new players, the stats are already set during creation, no need to update
        console.log(`New player ${player.player_name} already has stats from creation`);
      }
    }

    await db.pool.query('COMMIT');
    res.json({ 
      success: true, 
      matchId, 
      message: 'Match created successfully from CSV',
      createdPlayers: createdPlayers.length
    });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error('Error creating match from CSV:', err);
    res.status(500).json({ error: `Failed to create match from CSV data: ${err.message}` });
  }
});

// Draw random teams from provided player IDs
app.post('/api/draw/random', requireAuth, async (req, res) => {
  const { playerIds } = req.body;
  if (!Array.isArray(playerIds) || playerIds.length < 10) return res.status(400).json({ error: 'playerIds array of at least 10 required' });

  try {
    const shuffled = playerIds.slice().sort(() => Math.random() - 0.5).slice(0,10);
    const teamA = shuffled.slice(0,5);
    const teamB = shuffled.slice(5,10);

    const rows = await db.query('SELECT * FROM players WHERE id = ANY($1)', [shuffled]);
    const map = new Map(rows.rows.map(r => [r.id, r]));
    res.json({ teamA: teamA.map(id => map.get(id)), teamB: teamB.map(id => map.get(id)) });
  } catch (err) {
    console.error('Error drawing random teams:', err);
    res.status(503).json({ error: 'database unavailable' });
  }
});


// Draw balanced teams by metric: 'kd' or 'damage'
app.post('/api/draw/balance', requireAuth, async (req, res) => {
  const { playerIds, metric } = req.body;
  if (!Array.isArray(playerIds) || playerIds.length < 10) return res.status(400).json({ error: 'playerIds array of at least 10 required' });
  if (!['kd','damage'].includes(metric)) return res.status(400).json({ error: "metric must be 'kd' or 'damage'" });

  try {
    const ids = playerIds.slice(0,10);
    const rows = await db.query('SELECT * FROM players WHERE id = ANY($1)', [ids]);
    const players = rows.rows;

  // choose sortKey
  const key = metric === 'kd' ? (p => parseFloat(p.kd)||0) : (p => parseInt(p.total_damage)||0);
  players.sort((a,b) => (key(b) - key(a)));


  // Improved balanced allocation algorithm - inline implementation
  let bestBalance = Infinity;
  let bestTeams = { teamA: [], teamB: [] };
  
  // Strategy 1: Snake draft (alternating picks)
  const snakeTeamA = [];
  const snakeTeamB = [];
  for (let i = 0; i < players.length; i++) {
    if (i % 2 === 0) {
      snakeTeamA.push(players[i]);
    } else {
      snakeTeamB.push(players[i]);
    }
  }
  const snakeSumA = snakeTeamA.reduce((sum, p) => sum + key(p), 0);
  const snakeSumB = snakeTeamB.reduce((sum, p) => sum + key(p), 0);
  const snakeBalance = Math.abs(snakeSumA - snakeSumB);
  if (snakeBalance < bestBalance) {
    bestBalance = snakeBalance;
    bestTeams = { teamA: snakeTeamA, teamB: snakeTeamB };
  }
  
  // Strategy 2: Greedy algorithm
  const greedyTeamA = [];
  const greedyTeamB = [];
  const remaining = [...players];
  
  // Start with the two best players
  greedyTeamA.push(remaining.shift());
  greedyTeamB.push(remaining.shift());
  
  // Greedily assign remaining players
  while (remaining.length > 0) {
    const currentTeamASum = greedyTeamA.reduce((sum, p) => sum + key(p), 0);
    const currentTeamBSum = greedyTeamB.reduce((sum, p) => sum + key(p), 0);
    
    let bestPlayer = null;
    let bestTeam = null;
    let bestDifference = Infinity;
    
    // Try assigning each remaining player to each team
    for (let i = 0; i < remaining.length; i++) {
      const player = remaining[i];
      
      // Try adding to team A
      const newTeamASum = currentTeamASum + key(player);
      const diffA = Math.abs(newTeamASum - currentTeamBSum);
      
      if (diffA < bestDifference) {
        bestDifference = diffA;
        bestPlayer = player;
        bestTeam = 'A';
      }
      
      // Try adding to team B
      const newTeamBSum = currentTeamBSum + key(player);
      const diffB = Math.abs(currentTeamASum - newTeamBSum);
      
      if (diffB < bestDifference) {
        bestDifference = diffB;
        bestPlayer = player;
        bestTeam = 'B';
      }
    }
    
    // Assign the best player to the best team
    if (bestPlayer && bestTeam) {
      if (bestTeam === 'A') {
        greedyTeamA.push(bestPlayer);
      } else {
        greedyTeamB.push(bestPlayer);
      }
      
      // Remove the assigned player
      const index = remaining.findIndex(p => p.id === bestPlayer.id);
      if (index !== -1) {
        remaining.splice(index, 1);
      }
    } else {
      // Fallback: assign remaining players alternately if no valid assignment found
      const player = remaining.shift();
      if (player) {
        if (greedyTeamA.length <= greedyTeamB.length) {
          greedyTeamA.push(player);
        } else {
          greedyTeamB.push(player);
        }
      }
    }
  }
  
  const greedySumA = greedyTeamA.reduce((sum, p) => sum + key(p), 0);
  const greedySumB = greedyTeamB.reduce((sum, p) => sum + key(p), 0);
  const greedyBalance = Math.abs(greedySumA - greedySumB);
  if (greedyBalance < bestBalance) {
    bestBalance = greedyBalance;
    bestTeams = { teamA: greedyTeamA, teamB: greedyTeamB };
  }
  
  // Strategy 3: Exhaustive search for optimal balance (try many more combinations)
  for (let attempt = 0; attempt < 200; attempt++) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const randomTeamA = shuffled.slice(0, 5);
    const randomTeamB = shuffled.slice(5, 10);
    
    const randomSumA = randomTeamA.reduce((sum, p) => sum + key(p), 0);
    const randomSumB = randomTeamB.reduce((sum, p) => sum + key(p), 0);
    const randomBalance = Math.abs(randomSumA - randomSumB);
    
    if (randomBalance < bestBalance) {
      bestBalance = randomBalance;
      bestTeams = { teamA: randomTeamA, teamB: randomTeamB };
    }
  }
  
  // Strategy 4: Advanced optimization - try swapping players between teams
  let improved = true;
  let iterations = 0;
  const maxIterations = 20;
  
  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    
    const currentTeamA = [...bestTeams.teamA];
    const currentTeamB = [...bestTeams.teamB];
    
    // Try swapping each player from team A with each player from team B
    for (let i = 0; i < currentTeamA.length; i++) {
      for (let j = 0; j < currentTeamB.length; j++) {
        // Create new teams with swapped players
        const newTeamA = [...currentTeamA];
        const newTeamB = [...currentTeamB];
        
        // Swap players
        [newTeamA[i], newTeamB[j]] = [newTeamB[j], newTeamA[i]];
        
        // Calculate new balance
        const newSumA = newTeamA.reduce((sum, p) => sum + key(p), 0);
        const newSumB = newTeamB.reduce((sum, p) => sum + key(p), 0);
        const newBalance = Math.abs(newSumA - newSumB);
        
        // If this swap improves balance, keep it
        if (newBalance < bestBalance) {
          bestBalance = newBalance;
          bestTeams = { teamA: newTeamA, teamB: newTeamB };
          improved = true;
        }
      }
    }
  }
  
  // Strategy 5: Final optimization pass - try all possible 2-player swaps
  for (let i = 0; i < bestTeams.teamA.length; i++) {
    for (let j = i + 1; j < bestTeams.teamA.length; j++) {
      // Try swapping two players within team A
      const newTeamA = [...bestTeams.teamA];
      [newTeamA[i], newTeamA[j]] = [newTeamA[j], newTeamA[i]];
      
      const newSumA = newTeamA.reduce((sum, p) => sum + key(p), 0);
      const newSumB = bestTeams.teamB.reduce((sum, p) => sum + key(p), 0);
      const newBalance = Math.abs(newSumA - newSumB);
      
      if (newBalance < bestBalance) {
        bestBalance = newBalance;
        bestTeams = { teamA: newTeamA, teamB: [...bestTeams.teamB] };
      }
    }
  }
  
  for (let i = 0; i < bestTeams.teamB.length; i++) {
    for (let j = i + 1; j < bestTeams.teamB.length; j++) {
      // Try swapping two players within team B
      const newTeamB = [...bestTeams.teamB];
      [newTeamB[i], newTeamB[j]] = [newTeamB[j], newTeamB[i]];
      
      const newSumA = bestTeams.teamA.reduce((sum, p) => sum + key(p), 0);
      const newSumB = newTeamB.reduce((sum, p) => sum + key(p), 0);
      const newBalance = Math.abs(newSumA - newSumB);
      
      if (newBalance < bestBalance) {
        bestBalance = newBalance;
        bestTeams = { teamA: [...bestTeams.teamA], teamB: newTeamB };
      }
    }
  }

  
    res.json({ teamA: bestTeams.teamA, teamB: bestTeams.teamB });
  } catch (err) {
    console.error('Error drawing balanced teams:', err);
    res.status(503).json({ error: 'database unavailable' });
  }
});

// Delete a match and update player stats
app.delete('/api/matches/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.pool.query('BEGIN');
    
    // Get match data before deleting
    const matchResult = await db.query(
      `SELECT mp.*, p.name 
       FROM match_players mp 
       JOIN players p ON mp.player_id = p.id 
       WHERE mp.match_id = $1`,
      [id]
    );
    
    if (matchResult.rows.length === 0) {
      await db.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Update player stats by subtracting match stats
    for (const player of matchResult.rows) {
      await db.query(
        `UPDATE players SET
           games = games - 1,
           wins = wins - CASE WHEN $2='win' THEN 1 ELSE 0 END,
           loses = loses - CASE WHEN $2='loss' THEN 1 ELSE 0 END,
           draws = draws - CASE WHEN $2='draw' THEN 1 ELSE 0 END,
           total_kills = total_kills - $3,
           total_deaths = total_deaths - $4,
           total_damage = total_damage - $5
         WHERE id = $1`,
        [
          player.player_id,
          player.result,
          player.kills || 0,
          player.deaths || 0,
          player.damage || 0
        ]
      );
      
      // Recompute averages and kd
      await db.query(
        `UPDATE players SET
           ave_kills = CASE WHEN games>0 THEN round(total_kills::numeric / games,1) ELSE 0 END,
           ave_deaths = CASE WHEN games>0 THEN round(total_deaths::numeric / games,1) ELSE 0 END,
           ave_damage = CASE WHEN games>0 THEN round(total_damage::numeric / games,0) ELSE 0 END,
           kd = CASE WHEN total_deaths>0 THEN round((total_kills::numeric / total_deaths),2) ELSE total_kills END
         WHERE id = $1`,
        [player.player_id]
      );
    }
    
    // Delete match players
    await db.query('DELETE FROM match_players WHERE match_id = $1', [id]);
    
    // Delete match
    await db.query('DELETE FROM matches WHERE id = $1', [id]);
    
    await db.pool.query('COMMIT');
    res.json({ ok: true, message: 'Match deleted successfully' });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'failed to delete match' });
  }
});

// Update a match and recalculate player stats
app.put('/api/matches/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { teams } = req.body;
  
  try {
    await db.pool.query('BEGIN');
    
    // Get old match data
    const oldMatchResult = await db.query(
      `SELECT mp.* FROM match_players mp WHERE mp.match_id = $1`,
      [id]
    );
    
    if (oldMatchResult.rows.length === 0) {
      await db.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // First, subtract old stats from players
    for (const player of oldMatchResult.rows) {
      await db.query(
        `UPDATE players SET
           games = games - 1,
           wins = wins - CASE WHEN $2='win' THEN 1 ELSE 0 END,
           loses = loses - CASE WHEN $2='loss' THEN 1 ELSE 0 END,
           draws = draws - CASE WHEN $2='draw' THEN 1 ELSE 0 END,
           total_kills = total_kills - $3,
           total_deaths = total_deaths - $4,
           total_damage = total_damage - $5
         WHERE id = $1`,
        [
          player.player_id,
          player.result,
          player.kills || 0,
          player.deaths || 0,
          player.damage || 0
        ]
      );
    }
    
    // Delete old match players
    await db.query('DELETE FROM match_players WHERE match_id = $1', [id]);
    
    // Insert new match players
    const allPlayers = [...teams.team1, ...teams.team2];
    for (const player of allPlayers) {
      // Convert team string to integer (team1 -> 1, team2 -> 2)
      const teamNumber = player.team === 'team1' ? 1 : 2;
      
      await db.query(
        `INSERT INTO match_players (match_id, player_id, team, kills, deaths, assists, headshot_percentage, damage, result)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          player.id,
          teamNumber,
          player.kills || 0,
          player.deaths || 0,
          player.assists || 0,
          player.headshot_percentage || 0,
          player.damage || 0,
          player.result || 'loss'
        ]
      );
      
      // Add new stats to players
      await db.query(
        `UPDATE players SET
           games = games + 1,
           wins = wins + CASE WHEN $2='win' THEN 1 ELSE 0 END,
           loses = loses + CASE WHEN $2='loss' THEN 1 ELSE 0 END,
           draws = draws + CASE WHEN $2='draw' THEN 1 ELSE 0 END,
           total_kills = total_kills + $3,
           total_deaths = total_deaths + $4,
           total_damage = total_damage + $5
         WHERE id = $1`,
        [
          player.id,
          player.result,
          player.kills || 0,
          player.deaths || 0,
          player.damage || 0
        ]
      );
      
      // Recompute averages and kd
      await db.query(
        `UPDATE players SET
           ave_kills = CASE WHEN games>0 THEN round(total_kills::numeric / games,1) ELSE 0 END,
           ave_deaths = CASE WHEN games>0 THEN round(total_deaths::numeric / games,1) ELSE 0 END,
           ave_damage = CASE WHEN games>0 THEN round(total_damage::numeric / games,0) ELSE 0 END,
           kd = CASE WHEN total_deaths>0 THEN round((total_kills::numeric / total_deaths),2) ELSE total_kills END
         WHERE id = $1`,
        [player.id]
      );
    }
    
    await db.pool.query('COMMIT');
    res.json({ ok: true, message: 'Match updated successfully' });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'failed to update match' });
  }
});

// Get all maps with match counts
app.get('/api/maps', async (req, res) => {
  try {
    const maps = await db.query(`
      SELECT 
        map.id,
        map.display_name as map_name,
        map.name as map_slug,
        COUNT(DISTINCT m.id) as match_count
      FROM maps map
      LEFT JOIN matches m ON m.map_id = map.id
      GROUP BY map.id, map.display_name, map.name
      ORDER BY map.display_name
    `);
    
    res.json(maps.rows);
  } catch (err) {
    console.error('Error fetching maps:', err);
    res.status(500).json({ error: 'failed to fetch maps' });
  }
});

// Get detailed statistics for a specific map
app.get('/api/maps/:mapId/stats', async (req, res) => {
  try {
    const { mapId } = req.params;
    
    // Get map info
    const mapInfo = await db.query(`
      SELECT id, display_name as map_name, name as map_slug
      FROM maps
      WHERE id = $1
    `, [mapId]);
    
    if (mapInfo.rows.length === 0) {
      return res.status(404).json({ error: 'map not found' });
    }
    
    const map = mapInfo.rows[0];
    
    // Get total matches on this map
    const totalMatches = await db.query(`
      SELECT COUNT(DISTINCT id) as total
      FROM matches
      WHERE map_id = $1
    `, [mapId]);
    
    // Get best player by winrate (desempate por KD si hay empate)
    const bestPlayer = await db.query(`
      WITH player_stats AS (
        SELECT 
          p.id,
          p.name,
          COUNT(CASE WHEN mp.result = 'win' THEN 1 END) as wins,
          COUNT(mp.id) as total_games,
          ROUND((COUNT(CASE WHEN mp.result = 'win' THEN 1 END)::numeric / COUNT(mp.id)) * 100, 1) as winrate,
          CASE 
            WHEN SUM(mp.deaths) > 0 THEN ROUND(SUM(mp.kills)::numeric / SUM(mp.deaths), 2)
            ELSE SUM(mp.kills)::numeric
          END as avg_kd
        FROM match_players mp
        JOIN matches m ON mp.match_id = m.id
        JOIN players p ON mp.player_id = p.id
        WHERE m.map_id = $1
        GROUP BY p.id, p.name
        HAVING COUNT(mp.id) > 0
      )
      SELECT * FROM player_stats
      ORDER BY winrate DESC, avg_kd DESC
      LIMIT 1
    `, [mapId]);
    
    // Get player with highest K/D on this map
    const highestKD = await db.query(`
      SELECT 
        p.id,
        p.name,
        ROUND(SUM(mp.kills)::numeric / NULLIF(SUM(mp.deaths), 0), 2) as avg_kd,
        COUNT(mp.id) as total_games,
        SUM(mp.kills) as total_kills,
        SUM(mp.deaths) as total_deaths
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
      JOIN players p ON mp.player_id = p.id
      WHERE m.map_id = $1
      GROUP BY p.id, p.name
      HAVING COUNT(mp.id) > 0 AND SUM(mp.deaths) > 0
      ORDER BY avg_kd DESC
      LIMIT 1
    `, [mapId]);
    
    // Get worst player by winrate
    const worstPlayer = await db.query(`
      SELECT 
        p.id,
        p.name,
        COUNT(CASE WHEN mp.result = 'win' THEN 1 END) as wins,
        COUNT(mp.id) as total_games,
        ROUND((COUNT(CASE WHEN mp.result = 'win' THEN 1 END)::numeric / COUNT(mp.id)) * 100, 1) as winrate
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
      JOIN players p ON mp.player_id = p.id
      WHERE m.map_id = $1
      GROUP BY p.id, p.name
      HAVING COUNT(mp.id) > 0
      ORDER BY winrate ASC NULLS LAST, wins ASC, COUNT(mp.id) ASC
      LIMIT 1
    `, [mapId]);
    
    // Get player with most damage on this map
    const mostDamage = await db.query(`
      SELECT 
        p.id,
        p.name,
        SUM(mp.damage) as total_damage,
        ROUND(AVG(mp.damage), 0) as avg_damage,
        COUNT(mp.id) as total_games
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
      JOIN players p ON mp.player_id = p.id
      WHERE m.map_id = $1
      GROUP BY p.id, p.name
      HAVING COUNT(mp.id) > 0
      ORDER BY avg_damage DESC
      LIMIT 1
    `, [mapId]);
    
    // Get player with most kills on this map
    const mostKills = await db.query(`
      SELECT 
        p.id,
        p.name,
        SUM(mp.kills) as total_kills,
        ROUND(AVG(mp.kills), 1) as avg_kills,
        COUNT(mp.id) as total_games
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
      JOIN players p ON mp.player_id = p.id
      WHERE m.map_id = $1
      GROUP BY p.id, p.name
      HAVING COUNT(mp.id) > 0
      ORDER BY total_kills DESC
      LIMIT 1
    `, [mapId]);
    
    // Get player with most deaths on this map
    const mostDeaths = await db.query(`
      SELECT 
        p.id,
        p.name,
        SUM(mp.deaths) as total_deaths,
        ROUND(AVG(mp.deaths), 1) as avg_deaths,
        COUNT(mp.id) as total_games
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
      JOIN players p ON mp.player_id = p.id
      WHERE m.map_id = $1
      GROUP BY p.id, p.name
      HAVING COUNT(mp.id) > 0
      ORDER BY total_deaths DESC
      LIMIT 1
    `, [mapId]);
    
    // Debug logs (temporary)
    console.log('Map stats debug for mapId:', mapId);
    console.log('bestPlayer rows:', bestPlayer.rows.length, bestPlayer.rows[0]);
    console.log('mostKills rows:', mostKills.rows.length, mostKills.rows[0]);
    console.log('mostDeaths rows:', mostDeaths.rows.length, mostDeaths.rows[0]);
    console.log('worstPlayer rows:', worstPlayer.rows.length, worstPlayer.rows[0]);
    
    // Get all players stats for this map
    const allPlayersStats = await db.query(`
      SELECT 
        p.id,
        p.name,
        COUNT(CASE WHEN mp.result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN mp.result = 'loss' THEN 1 END) as losses,
        COUNT(CASE WHEN mp.result = 'draw' THEN 1 END) as draws,
        COUNT(mp.id) as total_games,
        ROUND((COUNT(CASE WHEN mp.result = 'win' THEN 1 END)::numeric / COUNT(mp.id)) * 100, 1) as winrate,
        ROUND(SUM(mp.kills)::numeric / NULLIF(SUM(mp.deaths), 0), 2) as avg_kd,
        ROUND(AVG(mp.damage), 0) as avg_damage,
        SUM(mp.kills) as total_kills,
        SUM(mp.deaths) as total_deaths,
        SUM(mp.damage) as total_damage
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
      JOIN players p ON mp.player_id = p.id
      WHERE m.map_id = $1
      GROUP BY p.id, p.name
      HAVING COUNT(mp.id) > 0
      ORDER BY 
        winrate DESC NULLS LAST,
        COALESCE(ROUND(SUM(mp.kills)::numeric / NULLIF(SUM(mp.deaths), 0), 2), 0) DESC
    `, [mapId]);
    
    res.json({
      map: map,
      total_matches: parseInt(totalMatches.rows[0]?.total || 0),
      best_player: bestPlayer.rows[0] || null,
      highest_kd: highestKD.rows[0] || null,
      worst_player: worstPlayer.rows[0] || null,
      most_damage: mostDamage.rows[0] || null,
      most_kills: mostKills.rows[0] || null,
      most_deaths: mostDeaths.rows[0] || null,
      all_players: allPlayersStats.rows.map(row => ({
        player_id: row.id,
        player_name: row.name,
        wins: parseInt(row.wins),
        losses: parseInt(row.losses),
        draws: parseInt(row.draws),
        total_games: parseInt(row.total_games),
        winrate: parseFloat(row.winrate || 0),
        avg_kd: parseFloat(row.avg_kd || 0),
        avg_damage: parseFloat(row.avg_damage || 0),
        total_kills: parseInt(row.total_kills || 0),
        total_deaths: parseInt(row.total_deaths || 0),
        total_damage: parseInt(row.total_damage || 0)
      }))
    });
  } catch (err) {
    console.error('Error fetching map details:', err);
    res.status(500).json({ error: 'failed to fetch map statistics' });
  }
});

// Get map statistics
app.get('/api/maps/stats', async (req, res) => {
  try {
    // Get most played map
    const mostPlayedMap = await db.query(`
      SELECT 
        m.map_id,
        map.display_name as map_name,
        map.name as map_slug,
        COUNT(DISTINCT m.id) as match_count
      FROM matches m
      LEFT JOIN maps map ON m.map_id = map.id
      GROUP BY m.map_id, map.display_name, map.name
      ORDER BY match_count DESC
      LIMIT 1
    `);

    // Get player winrate by map
    const playerMapStats = await db.query(`
      SELECT 
        p.id as player_id,
        p.name as player_name,
        m.map_id,
        map.display_name as map_name,
        map.name as map_slug,
        COUNT(CASE WHEN mp.result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN mp.result = 'loss' THEN 1 END) as losses,
        COUNT(CASE WHEN mp.result = 'draw' THEN 1 END) as draws,
        COUNT(mp.id) as total_games,
        CASE 
          WHEN COUNT(mp.id) > 0 THEN
            ROUND((COUNT(CASE WHEN mp.result = 'win' THEN 1 END)::numeric / COUNT(mp.id)) * 100, 1)
          ELSE 0
        END as winrate
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
      JOIN players p ON mp.player_id = p.id
      JOIN maps map ON m.map_id = map.id
      GROUP BY p.id, p.name, m.map_id, map.display_name, map.name
      ORDER BY p.name, map.display_name
    `);

    // Group player stats by player
    const statsByPlayer = {};
    playerMapStats.rows.forEach(row => {
      if (!statsByPlayer[row.player_id]) {
        statsByPlayer[row.player_id] = {
          player_id: row.player_id,
          player_name: row.player_name,
          maps: []
        };
      }
      statsByPlayer[row.player_id].maps.push({
        map_id: row.map_id,
        map_name: row.map_name,
        map_slug: row.map_slug,
        wins: parseInt(row.wins),
        losses: parseInt(row.losses),
        draws: parseInt(row.draws),
        total_games: parseInt(row.total_games),
        winrate: parseFloat(row.winrate)
      });
    });

    res.json({
      most_played_map: mostPlayedMap.rows[0] || null,
      player_map_stats: Object.values(statsByPlayer)
    });
  } catch (err) {
    console.error('Error fetching map stats:', err);
    res.status(500).json({ error: 'failed to fetch map statistics' });
  }
});

const port = process.env.PORT || 4000;
// Global error handler to avoid crashing on unhandled async errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal server error' });
});

app.listen(port, () => console.log('Server running on port', port));
