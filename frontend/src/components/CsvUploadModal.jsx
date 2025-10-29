import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';
import PlayerMatchingModal from './PlayerMatchingModal';

const CsvUploadModal = ({ isOpen, onClose, onMatchCreated }) => {
  const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { showError, showSuccess } = useToast();

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setCsvData(null);
      setShowMatchingModal(false);
      setIsProcessing(false);
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

  const handleUpload = async () => {
    if (!file) {
      showError('Por favor selecciona un archivo CSV');
      return;
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch(`${API}/api/matches/upload-csv`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('CSV upload response:', data);
      console.log('matchMapId from response:', data.matchMapId);

      if (!response.ok) {
        throw new Error(data.error || 'Error procesando el archivo CSV');
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
      const errorMessage = error.message || 'Error al procesar el archivo CSV';
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
          'Content-Type': 'application/json'
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
                  disabled={!file || isProcessing}
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
