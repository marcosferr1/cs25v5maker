import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';
import PlayerMatchingModal from './PlayerMatchingModal';

const CsvUploadModal = ({ isOpen, onClose, onMatchCreated }) => {
  const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [useTextInput, setUseTextInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { showError, showSuccess } = useToast();

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setCsvText('');
      setCsvData(null);
      setShowMatchingModal(false);
      setIsProcessing(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      showError('Por favor selecciona un archivo CSV válido');
    }
  };

  // Transform Excel format to CSV format
  const transformExcelToCsv = (text) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return text;

    // Detect separator
    const separator = lines[0].includes('\t') ? '\t' : ',';
    
    // Check if it's Excel format (first line starts with "Team 1" or "Team 2" followed by column headers)
    const firstLine = lines[0].trim();
    const firstLineLower = firstLine.toLowerCase();
    const startsWithTeam = firstLineLower.startsWith('team 1') || firstLineLower.startsWith('team 2');
    const hasTeamRows = lines.some(line => {
      const trimmed = line.trim().toLowerCase();
      return trimmed === 'team 1' || trimmed === 'team 2' || trimmed.startsWith('team 1\t') || trimmed.startsWith('team 2\t');
    });
    
    // Check if it's already CSV format (has "Team,Player" in first line)
    const isAlreadyCsv = firstLineLower.includes('team,player') || firstLineLower.includes('team, player');
    
    if (isAlreadyCsv) {
      return text; // Already in CSV format
    }
    
    if (!startsWithTeam && !hasTeamRows) {
      return text; // Not Excel format we recognize
    }

    // Build CSV output
    const csvLines = ['Team,Player,Kills,Deaths,Assists,HS%,DMG,Win Point,Lose Point,Map'];
    let currentTeam = '';
    let team1PlayerCount = 0;
    
    // Parse headers from first line
    // If first line starts with "Team 1" or "Team 2", extract the team and get headers
    let headerLine = firstLine;
    if (startsWithTeam) {
      // Extract team from first line (e.g., "Team 1	Kills	Deaths..." -> "Team 1")
      const teamMatch = firstLine.match(/^(Team\s+[12])/i);
      if (teamMatch) {
        currentTeam = teamMatch[1].toLowerCase().includes('1') ? 'Team 1' : 'Team 2';
        // Remove team prefix to get headers
        headerLine = firstLine.replace(/^Team\s+[12]\s*[\t,]/i, '').trim();
      }
    } else {
      // Headers are in first line, but we need to find where team rows are
      headerLine = firstLine;
    }
    
    const headers = headerLine.split(separator).map(h => h.trim());
    
    // Find column indices by searching in headers
    const getColumnIndex = (searchTerms) => {
      for (const term of searchTerms) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(term.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };
    
    // Map headers to expected positions
    // In Excel format: Team 1 | Kills | Deaths | Assists | HS% | DMG | Win Point | Lose point | Map
    // Player name is NOT in headers, it's the first column in data rows
    const killsIndex = getColumnIndex(['kill', 'kills']);
    const deathsIndex = getColumnIndex(['death', 'deaths']);
    const assistsIndex = getColumnIndex(['assist', 'assists']);
    const hsIndex = getColumnIndex(['hs%', 'hs', 'headshot']);
    const dmgIndex = getColumnIndex(['dmg', 'damage', 'daño']);
    const winIndex = getColumnIndex(['win point', 'winpoint', 'win']);
    const loseIndex = getColumnIndex(['lose point', 'losepoint', 'lose']);
    const mapIndex = getColumnIndex(['map', 'mapa']);
    
    // Track if we've seen an empty line (separator between teams)
    let seenEmptyLine = false;
    
    // Process data lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is an empty line (separator between teams)
      if (!line || line.split(separator).every(v => !v.trim())) {
        // If we were on Team 1 and haven't switched yet, this empty line means Team 2 starts
        if (currentTeam === 'Team 1' && !seenEmptyLine) {
          seenEmptyLine = true;
          // Don't switch team yet, wait for next non-empty line
        }
        continue;
      }
      
      const values = line.split(separator).map(v => (v || '').trim());
      if (values.length === 0) continue;
      
      const firstValue = (values[0] || '').toLowerCase().trim();
      
      // Check if this is a team header row
      if (firstValue === 'team 1' || firstValue === 'team 2') {
        currentTeam = firstValue === 'team 1' ? 'Team 1' : 'Team 2';
        team1PlayerCount = 0;
        seenEmptyLine = false;
        continue; // Skip the team header row
      }
      
      // Skip rows that are just team names
      if (!firstValue || firstValue === 'team 1' || firstValue === 'team 2') continue;
      
      // Auto-detect team switch: if we've seen an empty line or have 5 Team 1 players, switch to Team 2
      if (currentTeam === 'Team 1') {
        if (seenEmptyLine || team1PlayerCount >= 5) {
          currentTeam = 'Team 2';
          seenEmptyLine = false;
        }
      }
      
      // If we still don't have a team, assume Team 1 (for formats that don't have explicit team headers)
      if (!currentTeam) {
        currentTeam = 'Team 1';
      }
      
      // Helper function to safely get value or empty string
      const getValue = (index) => {
        if (index >= 0 && index < values.length) {
          return values[index] || '';
        }
        return '';
      };
      
      // In Excel format, the first column is always the player name
      const playerName = getValue(0);
      
      // Map values by header index, adjusting for the fact that player name is first in data but not in headers
      // Headers: "Kills | Deaths | Assists | HS% | DMG | Win Point | Lose point | Map"
      // Values: "Player | Kills | Deaths | Assists | HS% | DMG | Win Point | Lose point | Map"
      // So we need to add 1 to header indices to get the correct value index
      const kills = killsIndex >= 0 ? getValue(killsIndex + 1) : getValue(1);
      const deaths = deathsIndex >= 0 ? getValue(deathsIndex + 1) : getValue(2);
      const assists = assistsIndex >= 0 ? getValue(assistsIndex + 1) : getValue(3);
      const hs = hsIndex >= 0 ? getValue(hsIndex + 1) : getValue(4);
      const dmg = dmgIndex >= 0 ? getValue(dmgIndex + 1) : getValue(5);
      const winPoint = winIndex >= 0 ? getValue(winIndex + 1) : getValue(6);
      const losePoint = loseIndex >= 0 ? getValue(loseIndex + 1) : getValue(7);
      // Map is usually the last column, or at index 8
      const map = mapIndex >= 0 ? getValue(mapIndex + 1) : (getValue(8) || getValue(values.length - 1));
      
      // Only add if we have a player name and current team
      if (playerName && currentTeam) {
        csvLines.push(`${currentTeam},${playerName},${kills},${deaths},${assists},${hs},${dmg},${winPoint},${losePoint},${map}`);
        
        // Track Team 1 player count
        if (currentTeam === 'Team 1') {
          team1PlayerCount++;
        }
      }
    }
    
    return csvLines.join('\n');
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setCsvText(text);
    
    // Auto-transform if it looks like Excel format
    if (text.trim()) {
      const transformed = transformExcelToCsv(text);
      if (transformed !== text) {
        // Show a message that it was transformed
        setTimeout(() => {
          setCsvText(transformed);
          showSuccess('Formato Excel detectado y transformado automáticamente');
        }, 100);
      }
    }
  };

  const handleUpload = async () => {
    if (!useTextInput && !file) {
      showError('Por favor selecciona un archivo CSV o pega el texto CSV');
      return;
    }

    if (useTextInput && !csvText.trim()) {
      showError('Por favor pega el contenido del CSV');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    
    try {
      let response;
      
      if (useTextInput) {
        // Send CSV text
        response = await fetch(`${API}/api/matches/upload-csv-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
          },
          body: JSON.stringify({ csvText: csvText.trim() })
        });
      } else {
        // Send CSV file
        const formData = new FormData();
        formData.append('csvFile', file);
        response = await fetch(`${API}/api/matches/upload-csv`, {
          method: 'POST',
          headers: {
            ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
          },
          body: formData
        });
      }

      const data = await response.json();
      console.log('CSV upload response:', data);
      console.log('matchMapId from response:', data.matchMapId);

      if (!response.ok) {
        throw new Error(data.error || 'Error procesando el CSV');
      }

      setCsvData(data);
      
      if (data.unmatchedPlayers.length > 0) {
        setShowMatchingModal(true);
      } else {
        // All players matched, create match directly
        await createMatch(data.processedData, [], [], data.matchMapId);
      }

    } catch (error) {
      console.error('Error uploading CSV:', error);
      const errorMessage = error.message || 'Error al procesar el CSV';
      setErrorMessage(`Error procesando CSV: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const createMatch = async (processedData, unmatchedPlayers, newPlayers, matchMapId) => {
    try {
      const response = await fetch(`${API}/api/matches/from-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
        },
        body: JSON.stringify({
          processedData,
          unmatchedPlayers,
          newPlayers,
          matchMapId: matchMapId || 1
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando la partida');
      }

      showSuccess(`Partida creada exitosamente! ${data.createdPlayers > 0 ? `Se crearon ${data.createdPlayers} nuevos jugadores.` : ''}`);
      onMatchCreated();
      handleClose();

    } catch (error) {
      console.error('Error creating match:', error);
      showError(error.message || 'Error al crear la partida');
    }
  };

  const handleMatchingComplete = async (matchedPlayers, newPlayers) => {
    try {
      // Combine processed data with matched players
      const allProcessedData = [
        ...csvData.processedData,
        ...matchedPlayers.map(p => ({
          ...p,
          player_id: p.matchedPlayer.id,
          player_name: p.matchedPlayer.name
        }))
      ];

      // Get the remaining unmatched players (those that were created as new)
      const remainingUnmatchedPlayers = csvData.unmatchedPlayers.filter(p => 
        !matchedPlayers.some(mp => mp.csvName === p.csvName)
      );

      await createMatch(allProcessedData, remainingUnmatchedPlayers, newPlayers, csvData.matchMapId);
      setShowMatchingModal(false);
    } catch (error) {
      console.error('Error completing match creation:', error);
      showError('Error al completar la creación de la partida');
    }
  };

  const handleClose = () => {
    setFile(null);
    setCsvData(null);
    setShowMatchingModal(false);
    setIsProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" style={{
        marginTop: "20px", width: "100%"
      }} onClick={handleClose}>
        <div style={{
          width: "100%"
        }} className="modal-content csv-upload-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Subir Partida desde CSV</h3>
            <button className="close-button" onClick={handleClose}>×</button>
          </div>

          <div className="modal-body">
            {errorMessage && (
              <div className="error-message" style={{
                background: 'rgba(229, 62, 62, 0.1)',
                border: '1px solid rgba(229, 62, 62, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                color: 'var(--error)',
                fontSize: '14px'
              }}>
                ⚠️ {errorMessage}
              </div>
            )}
            <div className="upload-section">
              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setUseTextInput(false);
                    setCsvText('');
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: !useTextInput ? 'var(--accent-primary)' : 'transparent',
                    color: !useTextInput ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📁 Subir Archivo
                </button>
                <button
                  onClick={() => {
                    setUseTextInput(true);
                    setFile(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: useTextInput ? 'var(--accent-primary)' : 'transparent',
                    color: useTextInput ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📋 Pegar Texto
                </button>
              </div>

              {!useTextInput ? (
                <div className="file-input-container">
                  <label htmlFor="csv-file" className="file-input-label">
                    <div className="file-input-content">
                      <span className="file-icon">📁</span>
                      <span className="file-text">
                        {file ? file.name : 'Seleccionar archivo CSV'}
                      </span>
                    </div>
                  </label>
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Pega el contenido del CSV aquí:
                  </label>
                  <textarea
                    value={csvText}
                    onChange={handleTextChange}
                    placeholder="Pega aquí el CSV o el formato de Excel (con Team 1/Team 2 como filas)&#10;&#10;Ejemplo Excel:&#10;Team 1	Kills	Deaths...&#10;Jupy	18	14...&#10;Team 2	Kills	Deaths...&#10;Payo	22	10...&#10;&#10;O formato CSV:&#10;Team,Player,Kills,Deaths,Assists,HS%,DMG,Win Point,Lose Point,Map&#10;Team 1,Jupy,34,14,5,44,3331,1,1,"
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      resize: 'vertical',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              )}

              <div className="csv-format-info">
                <h4>Formato requerido del CSV:</h4>
                <div className="format-example">
                  <code>
                    Team,Player,Kills,Deaths,Assists,HS%,DMG,Win Point,Lose Point
                  </code>
                </div>
                <ul className="format-notes">
                  <li>• Debe tener exactamente 10 jugadores (5 por equipo)</li>
                  <li>• Los equipos deben ser "Team 1" y "Team 2"</li>
                  <li>• Si no encuentra un jugador, podrás conectarlo o crearlo</li>
                </ul>
              </div>

              <div className="upload-actions">
                <button
                  onClick={handleUpload}
                  disabled={(!file && !csvText.trim()) || isProcessing}
                  className="upload-button"
                >
                  {isProcessing ? 'Procesando...' : 'Procesar CSV'}
                </button>
              </div>
            </div>

            {csvData && (
              <div className="processing-results">
                <h4>Resultados del procesamiento:</h4>
                <div className="results-summary">
                  <div className="result-item success">
                    <span className="result-icon">✅</span>
                    <span>{csvData.processedData.length} jugadores encontrados</span>
                  </div>
                  {csvData.unmatchedPlayers.length > 0 && (
                    <div className="result-item warning">
                      <span className="result-icon">⚠️</span>
                      <span>{csvData.unmatchedPlayers.length} jugadores sin coincidencia</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMatchingModal && csvData && (
        <PlayerMatchingModal
          isOpen={showMatchingModal}
          onClose={() => setShowMatchingModal(false)}
          unmatchedPlayers={csvData.unmatchedPlayers}
          onComplete={handleMatchingComplete}
        />
      )}
    </>
  );
};

export default CsvUploadModal;
