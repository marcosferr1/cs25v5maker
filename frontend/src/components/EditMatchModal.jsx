import React, { useState, useEffect } from 'react';
import { useConfirmationModal } from '../hooks/useConfirmationModal';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from './ConfirmationModal';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const EditMatchModal = ({ matchId, onClose, onSave, isLoading }) => {
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({ team1: [], team2: [] });
  const [isLoadingMatch, setIsLoadingMatch] = useState(true);
  const [errors, setErrors] = useState({});
  const [winningTeam, setWinningTeam] = useState('team1'); // 'team1', 'team2', or 'draw'
  const { modalState, showConfirmation, hideConfirmation, handleConfirm } = useConfirmationModal();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails();
    }
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      setIsLoadingMatch(true);
      const response = await fetch(`${API}/api/matches/${matchId}`);
      if (!response.ok) {
        throw new Error('Error al cargar los detalles de la partida');
      }
      
      const data = await response.json();
      setMatch(data);
      
      // Organize players by team
      const team1 = data.teams.team1 || [];
      const team2 = data.teams.team2 || [];
      setTeams({ team1, team2 });
      
      // Determine winning team based on results
      const team1Wins = team1.filter(p => p.result === 'win').length;
      const team2Wins = team2.filter(p => p.result === 'win').length;
      
      if (team1Wins > team2Wins) {
        setWinningTeam('team1');
      } else if (team2Wins > team1Wins) {
        setWinningTeam('team2');
      } else {
        setWinningTeam('draw');
      }
    } catch (err) {
      console.error('Error fetching match details:', err);
      showError(err.message || 'Error al cargar los detalles de la partida');
    } finally {
      setIsLoadingMatch(false);
    }
  };

  const updatePlayerStat = (teamKey, playerIndex, field, value) => {
    setTeams(prev => ({
      ...prev,
      [teamKey]: prev[teamKey].map((player, index) => 
        index === playerIndex 
          ? { ...player, [field]: value }
          : player
      )
    }));
  };

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
    
    // Check if both teams have 5 players
    if (teams.team1.length !== 5) {
      newErrors.team1 = 'Team 1 debe tener exactamente 5 jugadores';
    }
    if (teams.team2.length !== 5) {
      newErrors.team2 = 'Team 2 debe tener exactamente 5 jugadores';
    }

    // Check for valid stats
    [...teams.team1, ...teams.team2].forEach((player, index) => {
      const teamKey = index < 5 ? 'team1' : 'team2';
      const playerIndex = index < 5 ? index : index - 5;
      
      if (player.kills === undefined || player.kills === null || player.kills < 0) {
        newErrors[`${teamKey}_${playerIndex}_kills`] = 'Kills debe ser un número válido';
      }
      if (player.deaths === undefined || player.deaths === null || player.deaths < 0) {
        newErrors[`${teamKey}_${playerIndex}_deaths`] = 'Deaths debe ser un número válido';
      }
      if (player.damage === undefined || player.damage === null || player.damage < 0) {
        newErrors[`${teamKey}_${playerIndex}_damage`] = 'Damage debe ser un número válido';
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
      
      await onSave(teamsForBackend);
      showSuccess('Partida actualizada exitosamente');
    } catch (err) {
      console.error('Error saving match:', err);
      showError(err.message || 'Error al actualizar la partida');
    }
  };

  const renderPlayerForm = (player, teamKey, playerIndex) => (
    <div key={player.player_id} className="player-form-row" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '8px',
      border: '1px solid var(--border-color)',
      borderRadius: '4px',
      background: 'var(--bg-primary)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div className="player-info" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
      }}>
        <span className="player-name" style={{
          fontFamily: 'Michroma, sans-serif',
          fontSize: '0.8rem',
          color: 'var(--text-primary)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0
        }}>{player.name}</span>
      </div>
      
      <div className="stats-inputs" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '4px',
        width: '100%'
      }}>
        <div className="input-group" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: 0
        }}>
          <label style={{
            fontSize: '0.6rem',
            fontFamily: 'Michroma, sans-serif',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            fontWeight: 500,
            textAlign: 'center'
          }}>Kills</label>
          <input
            type="number"
            min="0"
            value={player.kills || ''}
            onChange={(e) => updatePlayerStat(teamKey, playerIndex, 'kills', parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid var(--border-color)',
              borderRadius: '3px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontFamily: 'Michroma, sans-serif',
              fontSize: '0.7rem',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div className="input-group" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: 0
        }}>
          <label style={{
            fontSize: '0.6rem',
            fontFamily: 'Michroma, sans-serif',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            fontWeight: 500,
            textAlign: 'center'
          }}>Deaths</label>
          <input
            type="number"
            min="0"
            value={player.deaths || ''}
            onChange={(e) => updatePlayerStat(teamKey, playerIndex, 'deaths', parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid var(--border-color)',
              borderRadius: '3px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontFamily: 'Michroma, sans-serif',
              fontSize: '0.7rem',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div className="input-group" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: 0
        }}>
          <label style={{
            fontSize: '0.6rem',
            fontFamily: 'Michroma, sans-serif',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            fontWeight: 500,
            textAlign: 'center'
          }}>Assists</label>
          <input
            type="number"
            min="0"
            value={player.assists || ''}
            onChange={(e) => updatePlayerStat(teamKey, playerIndex, 'assists', parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid var(--border-color)',
              borderRadius: '3px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontFamily: 'Michroma, sans-serif',
              fontSize: '0.7rem',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div className="input-group" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: 0
        }}>
          <label style={{
            fontSize: '0.6rem',
            fontFamily: 'Michroma, sans-serif',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            fontWeight: 500,
            textAlign: 'center'
          }}>HS%</label>
          <input
            type="number"
            min="0"
            max="100"
            value={player.headshot_percentage || ''}
            onChange={(e) => updatePlayerStat(teamKey, playerIndex, 'headshot_percentage', parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid var(--border-color)',
              borderRadius: '3px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontFamily: 'Michroma, sans-serif',
              fontSize: '0.7rem',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div className="input-group" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: 0
        }}>
          <label style={{
            fontSize: '0.6rem',
            fontFamily: 'Michroma, sans-serif',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            fontWeight: 500,
            textAlign: 'center'
          }}>Damage</label>
          <input
            type="number"
            min="0"
            value={player.damage || ''}
            onChange={(e) => updatePlayerStat(teamKey, playerIndex, 'damage', parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid var(--border-color)',
              borderRadius: '3px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontFamily: 'Michroma, sans-serif',
              fontSize: '0.7rem',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        {/* Result is now managed automatically by winning team selection */}
      </div>
    </div>
  );

  if (isLoadingMatch) {
    return (
      <div className="match-details-modal">
        <div className="modal-content">
          <div className="loading">Cargando detalles...</div>
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
          <h3>Editar Partida #{match.id}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="match-form">
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
          
          <div className="teams-container" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0
          }}>
            <div className="team-form" style={{
              padding: '12px',
              marginBottom: '15px',
              minWidth: 0,
              overflow: 'hidden',
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <h4 style={{
                fontSize: '0.95rem',
                marginBottom: '12px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                color: 'var(--text-primary)',
                fontFamily: 'Michroma, sans-serif'
              }}>Team 1</h4>
              <div className="team-players" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                width: '100%'
              }}>
                {teams.team1.map((player, index) => renderPlayerForm(player, 'team1', index))}
              </div>
            </div>
            
            <div className="team-form" style={{
              padding: '12px',
              marginBottom: '15px',
              minWidth: 0,
              overflow: 'hidden',
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <h4 style={{
                fontSize: '0.95rem',
                marginBottom: '12px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                color: 'var(--text-primary)',
                fontFamily: 'Michroma, sans-serif'
              }}>Team 2</h4>
              <div className="team-players" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                width: '100%'
              }}>
                {teams.team2.map((player, index) => renderPlayerForm(player, 'team2', index))}
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="save-btn">
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
        
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
      </div>
    </div>
  );
};

export default EditMatchModal;
