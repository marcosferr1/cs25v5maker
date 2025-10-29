import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const MatchDetails = ({ matchId, onClose }) => {
  const [match, setMatch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails();
    }
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`${API}/api/matches/${matchId}`);
      if (!response.ok) {
        throw new Error('Error al cargar los detalles de la partida');
      }
      
      const data = await response.json();
      setMatch(data);
    } catch (err) {
      setError('Error al cargar los detalles de la partida');
      console.error('Error fetching match details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTeamTable = (team, teamName) => (
    <div className="team-table">
      <h4>{teamName}</h4>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Kills</th>
            <th>Deaths</th>
            <th>Assists</th>
            <th>HS%</th>
            <th>Damage</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {team.map((player) => (
            <tr key={player.player_id} className={player.result}>
              <td className="player-name">{player.name}</td>
              <td>{player.kills}</td>
              <td>{player.deaths}</td>
              <td>{player.assists}</td>
              <td>{player.headshot_percentage}%</td>
              <td>{player.damage.toLocaleString()}</td>
              <td>
                <span className={`result-badge ${player.result}`}>
                  {player.result === 'win' ? '✅ Win' : player.result === 'loss' ? '❌ Loss' : '🤝 Draw'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (isLoading) {
    return (
      <div className="match-details-modal">
        <div className="modal-content">
          <div className="loading">Cargando detalles...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-details-modal">
        <div className="modal-content">
          <div className="error-message">{error}</div>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    );
  }

  if (!match) {
    return null;
  }

  return (
    <div className="match-details-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Partida #{match.id}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="match-info">
          <p className="match-date">{formatDate(match.created_at)}</p>
          <p className="match-map">🗺️ Mapa: {match.map_name || 'Unknown'}</p>
        </div>
        
        <div className="teams-container">
          {renderTeamTable(match.teams.team1, 'Team 1')}
          {renderTeamTable(match.teams.team2, 'Team 2')}
        </div>
      </div>
    </div>
  );
};

export default MatchDetails;
