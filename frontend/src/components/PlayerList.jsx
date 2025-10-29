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
      {players.map((player) => (
        <label key={player.id} className="player-row">
          <input
            type="checkbox"
            checked={selectedPlayers.has(player.id)}
            onChange={() => onTogglePlayer(player.id)}
            disabled={isLoading}
          />
          <span className="player-info">
            <span className="player-name">{player.name}</span>
            <span className="player-stats">
              KD: {player.kd || '0.00'} | Dmg: {player.total_damage || '0'}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
};

export default PlayerList;
