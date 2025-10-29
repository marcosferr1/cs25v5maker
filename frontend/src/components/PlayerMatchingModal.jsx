import React, { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const PlayerMatchingModal = ({ isOpen, onClose, unmatchedPlayers, onComplete }) => {
  const [players, setPlayers] = useState([]);
  const [playerMatches, setPlayerMatches] = useState({});
  const [newPlayers, setNewPlayers] = useState([]);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
      initializeMatches();
    } else {
      // Reset state when modal closes
      setPlayerMatches({});
      setNewPlayers([]);
    }
  }, [isOpen]);

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${API}/api/players`);
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
      showError('Error al cargar la lista de jugadores');
    }
  };

  const initializeMatches = () => {
    const initialMatches = {};
    unmatchedPlayers.forEach(player => {
      initialMatches[player.csvName] = {
        action: 'create', // 'match', 'create'
        matchedPlayer: null,
        newName: player.csvName
      };
    });
    setPlayerMatches(initialMatches);
  };

  const handleActionChange = (playerName, action) => {
    setPlayerMatches(prev => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        action,
        matchedPlayer: action === 'match' ? prev[playerName].matchedPlayer : null
      }
    }));
  };

  const handlePlayerMatch = (playerName, playerId) => {
    const matchedPlayer = players.find(p => p.id === playerId);
    setPlayerMatches(prev => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        matchedPlayer
      }
    }));
  };

  const handleNewPlayerName = (playerName, newName) => {
    setPlayerMatches(prev => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        newName
      }
    }));
  };

  const handleComplete = () => {
    const matchedPlayers = [];
    const newPlayersToCreate = [];

    unmatchedPlayers.forEach(player => {
      const match = playerMatches[player.csvName];
      
      if (match.action === 'match') {
        if (!match.matchedPlayer) {
          showError(`Debes seleccionar un jugador para ${player.csvName}`);
          return;
        }
        matchedPlayers.push({
          ...player,
          matchedPlayer: match.matchedPlayer
        });
      } else if (match.action === 'create') {
        if (!match.newName.trim()) {
          showError(`Debes ingresar un nombre para ${player.csvName}`);
          return;
        }
        newPlayersToCreate.push({
          name: match.newName.trim(),
          originalCsvName: player.csvName
        });
      }
    });

    if (matchedPlayers.length + newPlayersToCreate.length !== unmatchedPlayers.length) {
      return; // Error already shown above
    }

    onComplete(matchedPlayers, newPlayersToCreate);
  };

  const renderPlayerMatching = (player) => {
    const match = playerMatches[player.csvName];
    
    return (
      <div key={player.csvName} className="player-matching-item">
        <div className="player-info">
          <div className="player-name">{player.csvName}</div>
          <div className="player-stats">
            <span>{player.kills}K/{player.deaths}D/{player.assists}A</span>
            <span>{player.damage} DMG</span>
            <span>{player.headshot_percentage}% HS</span>
          </div>
        </div>

        <div className="matching-options">
          <div className="action-selection">
            <label className="action-option">
              <input
                type="radio"
                name={`action-${player.csvName}`}
                value="match"
                checked={match?.action === 'match'}
                onChange={() => handleActionChange(player.csvName, 'match')}
              />
              <span>Conectar con jugador existente</span>
            </label>
            
            <label className="action-option">
              <input
                type="radio"
                name={`action-${player.csvName}`}
                value="create"
                checked={match?.action === 'create'}
                onChange={() => handleActionChange(player.csvName, 'create')}
              />
              <span>Crear nuevo jugador</span>
            </label>
          </div>

          {match?.action === 'match' && (
            <div className="player-selector">
              <select
                value={match.matchedPlayer?.id || ''}
                onChange={(e) => handlePlayerMatch(player.csvName, parseInt(e.target.value))}
              >
                <option value="">Seleccionar jugador...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (KD: {p.kd}, Games: {p.games})
                  </option>
                ))}
              </select>
            </div>
          )}

          {match?.action === 'create' && (
            <div className="new-player-input">
              <input
                type="text"
                value={match.newName || player.csvName}
                onChange={(e) => handleNewPlayerName(player.csvName, e.target.value)}
                placeholder="Nombre del nuevo jugador"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content player-matching-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔗 Conectar Jugadores</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="matching-instructions">
            <p>Los siguientes jugadores del CSV no se encontraron en la base de datos. 
               Puedes conectarlos con jugadores existentes o crear nuevos jugadores.</p>
          </div>

          <div className="players-matching-list">
            {unmatchedPlayers.map(renderPlayerMatching)}
          </div>

          <div className="matching-actions">
            <button onClick={handleComplete} className="complete-button">
              Completar y Crear Partida
            </button>
            <button onClick={onClose} className="cancel-button">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerMatchingModal;
