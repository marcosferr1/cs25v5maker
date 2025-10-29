import React, { useState, useEffect } from 'react';
import { useConfirmationModal } from '../hooks/useConfirmationModal';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from './ConfirmationModal';

const MatchForm = ({ players, lastTeams, onSaveMatch, isLoading }) => {
  const [teams, setTeams] = useState({ team1: [], team2: [] });
  const [useLastTeams, setUseLastTeams] = useState(false);
  const [errors, setErrors] = useState({});
  const [winningTeam, setWinningTeam] = useState('team1'); // 'team1', 'team2', or 'draw'
  const { modalState, showConfirmation, hideConfirmation, handleConfirm } = useConfirmationModal();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (useLastTeams && lastTeams) {
      setTeams({
        team1: lastTeams.teamA.map(player => ({
          id: player.id,
          name: player.name,
          team: 1,
          kills: 0,
          deaths: 0,
          assists: 0,
          headshot_percentage: 0,
          damage: 0,
          result: 'loss'
        })),
        team2: lastTeams.teamB.map(player => ({
          id: player.id,
          name: player.name,
          team: 2,
          kills: 0,
          deaths: 0,
          assists: 0,
          headshot_percentage: 0,
          damage: 0,
          result: 'loss'
        }))
      });
    } else {
      setTeams({ team1: [], team2: [] });
    }
  }, [useLastTeams, lastTeams]);

  // Apply winning team selection when teams change
  useEffect(() => {
    if (teams.team1.length > 0 && teams.team2.length > 0) {
      handleWinningTeamChange(winningTeam);
    }
  }, [teams.team1.length, teams.team2.length]);

  const handleWinningTeamChange = (newWinningTeam) => {
    setWinningTeam(newWinningTeam);
    
    // Update all player results based on winning team
    setTeams(prev => {
      const newTeams = { ...prev };
      
      if (newWinningTeam === 'team1') {
        newTeams.team1 = newTeams.team1.map(player => ({ ...player, result: 'win' }));
        newTeams.team2 = newTeams.team2.map(player => ({ ...player, result: 'loss' }));
      } else if (newWinningTeam === 'team2') {
        newTeams.team1 = newTeams.team1.map(player => ({ ...player, result: 'loss' }));
        newTeams.team2 = newTeams.team2.map(player => ({ ...player, result: 'win' }));
      } else if (newWinningTeam === 'draw') {
        newTeams.team1 = newTeams.team1.map(player => ({ ...player, result: 'draw' }));
        newTeams.team2 = newTeams.team2.map(player => ({ ...player, result: 'draw' }));
      }
      
      return newTeams;
    });
  };

  const validateTeams = () => {
    const newErrors = {};
    
    if (teams.team1.length !== 5) {
      newErrors.team1 = 'Team 1 debe tener exactamente 5 jugadores';
    }
    if (teams.team2.length !== 5) {
      newErrors.team2 = 'Team 2 debe tener exactamente 5 jugadores';
    }

    // Validate all players have required stats
    const allPlayers = [...teams.team1, ...teams.team2];
    allPlayers.forEach((player, index) => {
      if (player.kills < 0 || player.deaths < 0 || player.assists < 0 || 
          player.headshot_percentage < 0 || player.headshot_percentage > 100 || 
          player.damage < 0) {
        newErrors[`player_${index}`] = 'Estadísticas inválidas';
      }
    });

    setErrors(newErrors);
    
    // Show toast for validation errors
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showError(firstError);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateTeams()) {
      return;
    }

    // No need to validate team results since they're set automatically by winning team selection

    try {
      // Convert team numbers to team strings for backend
      const teamsForBackend = {
        team1: teams.team1.map(player => ({
          ...player,
          team: 'team1'
        })),
        team2: teams.team2.map(player => ({
          ...player,
          team: 'team2'
        }))
      };
      
      await onSaveMatch(teamsForBackend);
      showSuccess('Partida guardada exitosamente');
    } catch (err) {
      console.error('Error saving match:', err);
      showError(err.message || 'Error al guardar la partida');
    }
  };

  const updatePlayer = (teamKey, playerIndex, field, value) => {
    const newTeams = { ...teams };
    newTeams[teamKey][playerIndex] = {
      ...newTeams[teamKey][playerIndex],
      [field]: value
    };
    setTeams(newTeams);
    
    // Clear errors when user starts typing
    if (errors[`player_${teamKey}_${playerIndex}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`player_${teamKey}_${playerIndex}_${field}`];
      setErrors(newErrors);
    }
  };

  const addPlayerToTeam = (teamKey, playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const newTeams = { ...teams };
    if (newTeams[teamKey].length < 5) {
      newTeams[teamKey].push({
        id: player.id,
        name: player.name,
        team: teamKey === 'team1' ? 1 : 2,
        kills: 0,
        deaths: 0,
        assists: 0,
        headshot_percentage: 0,
        damage: 0,
        result: 'loss'
      });
      setTeams(newTeams);
    }
  };

  const removePlayerFromTeam = (teamKey, playerIndex) => {
    const newTeams = { ...teams };
    newTeams[teamKey].splice(playerIndex, 1);
    setTeams(newTeams);
  };

  const renderTeamForm = (teamKey, teamName) => (
    <div className="team-form">
      <h4>{teamName}</h4>
      {errors[teamKey] && <div className="error-message">{errors[teamKey]}</div>}
      
      <div className="team-players">
        {teams[teamKey].map((player, index) => (
          <div key={`${player.id}-${index}`} className="player-form-row">
            <div className="player-info">
              <span className="player-name">{player.name}</span>
              <button 
                type="button" 
                onClick={() => removePlayerFromTeam(teamKey, index)}
                className="remove-player"
              >
                ×
              </button>
            </div>
            
            <div className="stats-inputs">
              <div className="input-group">
                <label>Kills</label>
                <input
                  type="number"
                  min="0"
                  value={player.kills}
                  onChange={(e) => updatePlayer(teamKey, index, 'kills', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="input-group">
                <label>Deaths</label>
                <input
                  type="number"
                  min="0"
                  value={player.deaths}
                  onChange={(e) => updatePlayer(teamKey, index, 'deaths', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="input-group">
                <label>Assists</label>
                <input
                  type="number"
                  min="0"
                  value={player.assists}
                  onChange={(e) => updatePlayer(teamKey, index, 'assists', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="input-group">
                <label>HS%</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={player.headshot_percentage}
                  onChange={(e) => updatePlayer(teamKey, index, 'headshot_percentage', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="input-group">
                <label>Damage</label>
                <input
                  type="number"
                  min="0"
                  value={player.damage}
                  onChange={(e) => updatePlayer(teamKey, index, 'damage', parseInt(e.target.value) || 0)}
                />
              </div>
              
              {/* Result is now managed automatically by winning team selection */}
            </div>
          </div>
        ))}
      </div>
      
      {teams[teamKey].length < 5 && (
        <div className="add-player">
          <select 
            onChange={(e) => {
              if (e.target.value) {
                addPlayerToTeam(teamKey, parseInt(e.target.value));
                e.target.value = '';
              }
            }}
            value=""
          >
            <option value="">Agregar jugador...</option>
            {players
              .filter(p => !teams.team1.find(tp => tp.id === p.id) && !teams.team2.find(tp => tp.id === p.id))
              .map(player => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="match-form">
      <div className="form-header">
        <h3>Nueva Partida</h3>
        
        {lastTeams && (
          <div className="use-last-teams">
            <label>
              <input
                type="checkbox"
                checked={useLastTeams}
                onChange={(e) => setUseLastTeams(e.target.checked)}
              />
              Usar último sorteo realizado
            </label>
          </div>
        )}
      </div>

      {/* Winner Selection */}
      <div className="winner-selection">
        <h4>🏆 Equipo Ganador</h4>
        <div className="winner-options">
          <label className={`winner-option ${winningTeam === 'team1' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="winningTeam"
              value="team1"
              checked={winningTeam === 'team1'}
              onChange={(e) => handleWinningTeamChange(e.target.value)}
            />
            <span className="winner-label">Team 1</span>
          </label>
          
          <label className={`winner-option ${winningTeam === 'team2' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="winningTeam"
              value="team2"
              checked={winningTeam === 'team2'}
              onChange={(e) => handleWinningTeamChange(e.target.value)}
            />
            <span className="winner-label">Team 2</span>
          </label>
          
          <label className={`winner-option ${winningTeam === 'draw' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="winningTeam"
              value="draw"
              checked={winningTeam === 'draw'}
              onChange={(e) => handleWinningTeamChange(e.target.value)}
            />
            <span className="winner-label">Empate</span>
          </label>
        </div>
      </div>

      <div className="teams-container">
        {renderTeamForm('team1', 'Team 1')}
        {renderTeamForm('team2', 'Team 2')}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isLoading || teams.team1.length !== 5 || teams.team2.length !== 5}>
          {isLoading ? 'Guardando...' : 'Guardar Partida'}
        </button>
      </div>
      
      <ConfirmationModal
        open={modalState.open}
        onClose={hideConfirmation}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        type={modalState.type}
      />
    </form>
  );
};

export default MatchForm;
