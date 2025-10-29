import React, { useState, useEffect } from 'react';
import PlayerManagement from './PlayerManagement';
import AddPlayerForm from './AddPlayerForm';
import MapStatsPanel from './MapStatsPanel';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';

const API = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const PlayersSection = () => {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'add', or 'mapStats'
  const { toasts, removeToast } = useToast();

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${API}/api/players`);
      if (!response.ok) {
        throw new Error('Error al cargar jugadores');
      }
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handlePlayersUpdate = () => {
    fetchPlayers();
  };

  const handlePlayerAdded = () => {
    fetchPlayers();
  };

  if (isLoading) {
    return (
      <div className="players-section">
        <div className="loading">
          <p>Cargando jugadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="players-section">
      <div className="section-header">
        <h1>Gestión de Jugadores</h1>
        <p>Administra todos los jugadores del sistema CS2 5v5</p>
      </div>

      <div className="section-tabs">
        <button 
          className={activeTab === 'list' ? 'active' : ''}
          onClick={() => setActiveTab('list')}
        >
         Lista de Jugadores ({players.length})
        </button>

        <button 
          className={activeTab === 'mapStats' ? 'active' : ''}
          onClick={() => setActiveTab('mapStats')}
        >
          Estadísticas de Mapas
        </button>

        <button 
          className={activeTab === 'add' ? 'active' : ''}
          onClick={() => setActiveTab('add')}
        >
          Agregar Jugador
        </button>
      </div>

      <div className="section-content">
        {activeTab === 'list' && (
          <PlayerManagement 
            players={players}
            onPlayersUpdate={handlePlayersUpdate}
          />
        )}
        
        {activeTab === 'add' && (
          <AddPlayerForm 
            onPlayerAdded={handlePlayerAdded}
          />
        )}

        {activeTab === 'mapStats' && (
          <MapStatsPanel />
        )}
      </div>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default PlayersSection;
