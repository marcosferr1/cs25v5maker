import React, { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';

const API = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const PlayerHistory = ({ playerId, playerName, onClose }) => {
  const [history, setHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showError } = useToast();

  useEffect(() => {
    if (playerId) {
      fetchHistory();
    }
  }, [playerId]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API}/api/players/${playerId}/history`);
      
      if (!response.ok) {
        throw new Error('Error al cargar el historial');
      }
      
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      showError('Error al cargar el historial del jugador');
      console.error('Error fetching player history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getResultColor = (result) => {
    if (result === 'win') return '#38a169';
    if (result === 'loss') return '#e53e3e';
    return '#718096';
  };

  const getResultText = (result) => {
    if (result === 'win') return 'Victoria';
    if (result === 'loss') return 'Derrota';
    return 'Empate';
  };

  if (isLoading) {
    return (
      <div className="player-history-modal">
        <div className="modal-content">
          <div className="loading">Cargando historial...</div>
        </div>
      </div>
    );
  }

  if (!history) {
    return null;
  }

  const { player, matches } = history;

  return (
    <div className="player-history-modal">
      <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <div>
            <h2>Historial de {playerName || player.name}</h2>
            <p className="player-stats-summary">
              {player.games || 0} partidas | {player.wins || 0} victorias | {player.loses || 0} derrotas | {player.draws || 0} empates
            </p>
          </div>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        {matches.length === 0 ? (
          <div className="empty-state">
            <p>Este jugador no tiene partidas registradas aún.</p>
          </div>
        ) : (
          <div className="history-matches">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Mapa</th>
                  <th>Equipo</th>
                  <th>K</th>
                  <th>D</th>
                  <th>A</th>
                  <th>HS%</th>
                  <th>DMG</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.match_id} className={`match-row ${match.result}`}>
                    <td className="match-date">{formatDate(match.created_at)}</td>
                    <td className="match-map">{match.map_name || 'N/A'}</td>
                    <td className="match-team">Team {match.team}</td>
                    <td className="match-kills">{match.kills}</td>
                    <td className="match-deaths">{match.deaths}</td>
                    <td className="match-assists">{match.assists}</td>
                    <td className="match-hs">{match.headshot_percentage}%</td>
                    <td className="match-damage">{match.damage.toLocaleString()}</td>
                    <td className="match-result">
                      <span 
                        className="result-badge"
                        style={{ 
                          backgroundColor: getResultColor(match.result),
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '0.85rem'
                        }}
                      >
                        {getResultText(match.result)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerHistory;

