import React from 'react';

const PlayerList = ({ players, selectedPlayers, onTogglePlayer, isLoading }) => {
  if (isLoading) {
    return (
      <div className="players">
        <div className="loading">Cargando jugadores...</div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="players">
        <div className="empty-state">No hay jugadores registrados</div>
      </div>
    );
  }

  const getResultColor = (result) => {
    if (result === 'W') return '#38a169'; // green for win
    if (result === 'L') return '#e53e3e'; // red for loss
    return '#718096'; // gray for draw
  };

  return (
    <div className="players">
      <div className="players-header">
        <span>Seleccionados: {selectedPlayers.size} de {players.length}</span>
        {players.length >= 10 && (
          <span className="limit-reached">Límite alcanzado</span>
        )}
        {selectedPlayers.size > 0 && (
          <button 
            onClick={() => onTogglePlayer('clear')}
            className="clear-selection"
            style={{ backgroundColor: 'transparent', color: 'white',
              border: '1px solid white',
         
              fontFamily: 'Michroma',
             }}
          >
            Limpiar selección
          </button>
        )}
      </div>
      {players.map((player) => {
        const history = player.matchHistory || '';
        const winStreak = player.winStreak || 0;
        const lossStreak = player.lossStreak || 0;
        
        return (
          <label key={player.id} className="player-row">
            <input
              type="checkbox"
              checked={selectedPlayers.has(player.id)}
              onChange={() => onTogglePlayer(player.id)}
              disabled={isLoading}
            />
            <span className="player-info">
              <span className="player-name-container">
                <span className="player-name">{player.name}</span>
                {history && (
                  <span className="player-history">
                    {history.split('').map((result, idx) => (
                      <span
                        key={idx}
                        className="history-char"
                        style={{ color: getResultColor(result) }}
                      >
                        {result}
                      </span>
                    ))}
                  </span>
                )}
                {(winStreak > 0 || lossStreak > 0) && (
                  <span 
                    className="streak-indicator"
                    style={{
                      color: winStreak > 0 ? '#38a169' : '#e53e3e',
                    }}
                    title={winStreak > 0 ? `${winStreak} victorias seguidas` : `${lossStreak} derrotas seguidas`}
                  >
                    <span style={{ 
                      transform: 'rotate(-90deg)', 
                      display: 'inline-block',
                      fontSize: '10px',
                      lineHeight: '1'
                    }}>▶</span>
                    <span>{winStreak > 0 ? winStreak : lossStreak}</span>
                    <span style={{ fontSize: '0.7rem', marginLeft: '2px' }}>streak</span>
                  </span>
                )}
              </span>
              <span className="player-stats">
                KD: {player.kd || '0.00'} | Dmg: {player.total_damage || '0'}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
};

export default PlayerList;
