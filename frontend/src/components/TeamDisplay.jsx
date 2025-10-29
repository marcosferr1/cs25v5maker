import React from 'react';

const TeamDisplay = ({ teams, onNewDraw }) => {
  if (!teams) return null;

  // Validate teams structure
  if (!teams.teamA || !teams.teamB || !Array.isArray(teams.teamA) || !Array.isArray(teams.teamB)) {
    console.error('Invalid teams structure:', teams);
    return (
      <div className="teams-display">
        <div className="error-message">
          Error: Estructura de equipos inválida
        </div>
      </div>
    );
  }

  const calculateTeamStats = (team) => {
    if (!Array.isArray(team) || team.length === 0) {
      return {
        totalKD: '0.00',
        totalDamage: '0',
        avgKD: '0.00'
      };
    }

    let totalKD = 0;
    let totalDamage = 0;

    try {
      totalKD = team.reduce((sum, player) => {
        if (!player) return sum;
        const kd = parseFloat(player.kd);
        return sum + (isNaN(kd) ? 0 : kd);
      }, 0);
      
      totalDamage = team.reduce((sum, player) => {
        if (!player) return sum;
        const damage = parseInt(player.total_damage);
        return sum + (isNaN(damage) ? 0 : damage);
      }, 0);
    } catch (error) {
      console.error('Error calculating team stats:', error);
      return {
        totalKD: '0.00',
        totalDamage: '0',
        avgKD: '0.00'
      };
    }
    
    const avgKD = totalKD / team.length;
    
    return {
      totalKD: Number(totalKD).toFixed(2),
      totalDamage: Number(totalDamage).toLocaleString(),
      avgKD: Number(avgKD).toFixed(2)
    };
  };

  const teamAStats = calculateTeamStats(teams.teamA);
  const teamBStats = calculateTeamStats(teams.teamB);

  return (
    <div className="teams-display">
      <div className="teams-header">
        <h3>Equipos Generados</h3>
        <button onClick={onNewDraw} className="new-draw-button">
          Nuevo Sorteo
        </button>
      </div>
      
      <div className="teams">
        <div className="team team-a">
          <div className="team-header">
            <h4>Equipo A</h4>
            <div className="team-stats">
              <span>KD Promedio: {teamAStats.avgKD}</span>
              <span>Daño Total: {teamAStats.totalDamage}</span>
            </div>
          </div>
          <ul className="team-players">
            {teams.teamA.map((player, index) => (
              <li key={player?.id || index} className="team-player">
                <span className="player-number">{index + 1}.</span>
                <span className="player-name">{player?.name || 'Jugador desconocido'}</span>
                <span className="player-stats">
                  KD: {parseFloat(player?.kd || 0).toFixed(2)} | Dmg: {parseInt(player?.total_damage || 0).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="team team-b">
          <div className="team-header">
            <h4>Equipo B</h4>
            <div className="team-stats">
              <span>KD Promedio: {teamBStats.avgKD}</span>
              <span>Daño Total: {teamBStats.totalDamage}</span>
            </div>
          </div>
          <ul className="team-players">
            {teams.teamB.map((player, index) => (
              <li key={player?.id || index} className="team-player">
                <span className="player-number">{index + 1}.</span>
                <span className="player-name">{player?.name || 'Jugador desconocido'}</span>
                <span className="player-stats">
                  KD: {parseFloat(player?.kd || 0).toFixed(2)} | Dmg: {parseInt(player?.total_damage || 0).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="balance-info">
        <div className="balance-metric">
          <span>Diferencia KD: {Math.abs(teamAStats.avgKD - teamBStats.avgKD).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default TeamDisplay;
