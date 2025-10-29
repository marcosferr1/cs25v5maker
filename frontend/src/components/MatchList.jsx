import React, { useState, useEffect } from 'react';
import { useConfirmationModal } from '../hooks/useConfirmationModal';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from './ConfirmationModal';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const MatchList = ({ onViewMatch, onEditMatch, onDeleteMatch }) => {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { modalState, showConfirmation, hideConfirmation, handleConfirm } = useConfirmationModal();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`${API}/api/matches`);
      if (!response.ok) {
        throw new Error('Error al cargar las partidas');
      }
      
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      setError('Error al cargar las partidas');
      showError(err.message || 'Error al cargar las partidas');
      console.error('Error fetching matches:', err);
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

  const handleDeleteMatch = (matchId) => {
    showConfirmation({
      title: 'Eliminar Partida',
      message: '¿Estás seguro de que quieres eliminar esta partida? Esta acción también actualizará las estadísticas de todos los jugadores involucrados.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: async () => {
        try {
          await onDeleteMatch(matchId);
          showSuccess('Partida eliminada exitosamente');
          await fetchMatches(); // Refresh the list
        } catch (err) {
          console.error('Error deleting match:', err);
          showError(err.message || 'Error al eliminar la partida');
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="match-list">
        <h3>Historial de Partidas</h3>
        <div className="loading">Cargando partidas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-list">
        <h3>Historial de Partidas</h3>
        <div className="error-message">{error}</div>
        <button onClick={fetchMatches}>Reintentar</button>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="match-list">
        <h3>Historial de Partidas</h3>
        <div className="empty-state">No hay partidas registradas</div>
      </div>
    );
  }

  return (
    <div className="match-list">
      <div className="match-list-header">
        <h3>Historial de Partidas</h3>
        <button onClick={fetchMatches} className="refresh-button">
          🔄 Actualizar
        </button>
      </div>
      
      <div className="matches-grid">
        {matches.map((match) => (
          <div key={match.id} className="match-card">
            <div className="match-header">
              <h4>Partida #{match.id}</h4>
              <span className="match-date">{formatDate(match.created_at)}</span>
            </div>
            
            <div className="match-info">
              <span className="player-count">
                {match.player_count} jugadores
              </span>
            </div>
            
            <div className="match-actions">
              <button 
                onClick={() => onViewMatch(match.id)}
                className="view-match-button"
              >
                Ver Detalles
              </button>
              <button 
                onClick={() => onEditMatch(match.id)}
                className="edit-match-button"
              >
                Editar
              </button>
              <button 
                onClick={() => handleDeleteMatch(match.id)}
                className="delete-match-button"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
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
    </div>
  );
};

export default MatchList;
