import React from 'react';

const TeamDrawer = ({ selectedCount, onRandomDraw, onBalanceDraw, isLoading, totalPlayers }) => {
  const canDraw = selectedCount >= 10;
  const hasEnoughPlayers = totalPlayers >= 10;
  
  const selectedText = selectedCount < 10 
    ? `Selecciona ${10 - selectedCount} jugadores más para formar equipos`
    : `${selectedCount} jugadores seleccionados - Listo para sortear`;

  return (
    <div className="">
      <h2>Acciones</h2>
      <div className="">
        <p className={canDraw ? 'ready' : 'not-ready'}>
          {selectedText}
        </p>
        {hasEnoughPlayers && (
          <p className="ready">
             Tienes suficientes jugadores ({totalPlayers}) para formar equipos
          </p>
        )}
      </div>
      
      <div className="draw-buttons">
        <button 
          onClick={onRandomDraw}
          disabled={!canDraw || isLoading}
          className="draw-button random"
        >
          {isLoading ? 'Sorteando...' : 'Sorteo Aleatorio'}
        </button>
        
        <button 
          onClick={() => onBalanceDraw('kd')}
          disabled={!canDraw || isLoading}
          className="draw-button balance"
        >
          {isLoading ? 'Balanceando...' : 'Balancear por KD'}
        </button>
        
        <button 
          onClick={() => onBalanceDraw('damage')}
          disabled={!canDraw || isLoading}
          className="draw-button balance"
        >
          {isLoading ? 'Balanceando...' : 'Balancear por Daño'}
        </button>
      </div>
      

    </div>
  );
};

export default TeamDrawer;
