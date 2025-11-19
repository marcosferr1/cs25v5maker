import React, { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import { useConfirmationModal } from '../hooks/useConfirmationModal';
import { IconButton, Tooltip } from '@mui/material';
import { Edit, Delete, Save, Cancel, ArrowUpward, ArrowDownward, UnfoldMore } from '@mui/icons-material';
import ConfirmationModal from './ConfirmationModal';

const API = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const PlayerManagement = ({ players, onPlayersUpdate }) => {
  const [isEditing, setIsEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', kd: '', total_damage: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [sortField, setSortField] = useState('kd'); // Ordenar por K/D por defecto
  const [sortDirection, setSortDirection] = useState('desc'); // Ordenar descendente (mayor a menor)
  const { showError, showSuccess } = useToast();
  const { modalState, showConfirmation, hideConfirmation, handleConfirm } = useConfirmationModal();

  const handleEdit = (player) => {
    setIsEditing(player.id);
    setEditForm({
      name: player.name,
      kd: player.kd || '',
      total_damage: player.total_damage || ''
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditForm({ name: '', kd: '', total_damage: '' });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      showError('El nombre es requerido');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API}/api/players/${isEditing}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          kd: parseFloat(editForm.kd) || 0,
          total_damage: parseInt(editForm.total_damage) || 0
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar jugador');
      }

      showSuccess('Jugador actualizado exitosamente');
      setIsEditing(null);
      setEditForm({ name: '', kd: '', total_damage: '' });
      onPlayersUpdate(); // Refrescar la lista
    } catch (error) {
      showError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (playerId, playerName) => {
    showConfirmation({
      title: 'Eliminar Jugador',
      message: `¿Estás seguro de que quieres eliminar a "${playerName}"? Esta acción no se puede deshacer y se eliminarán todos sus datos y estadísticas.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => performDelete(playerId, playerName)
    });
  };

  const performDelete = async (playerId, playerName) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/api/players/${playerId}`, {
        method: 'DELETE',
        headers: {
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar jugador');
      }

      showSuccess(`${playerName} eliminado exitosamente`);
      onPlayersUpdate(); // Refrescar la lista
    } catch (error) {
      showError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Filter players based on search term
  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort players based on sort field and direction
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (!sortField) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle winrate calculation
    if (sortField === 'winrate') {
      const aGames = Number(a.games) || 0;
      const bGames = Number(b.games) || 0;
      aValue = aGames > 0 ? (Number(a.wins) || 0) / aGames : 0;
      bValue = bGames > 0 ? (Number(b.wins) || 0) / bGames : 0;
    }

    // Handle null/undefined values - convert to 0 for numeric fields
    if (aValue == null || aValue === '') aValue = 0;
    if (bValue == null || bValue === '') bValue = 0;

    // Convert to number for numeric comparison (for kd and other numeric fields)
    if (sortField === 'kd' || sortField === 'winrate' || typeof aValue === 'number' || !isNaN(Number(aValue))) {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
      const comparison = aValue - bValue;
      return sortDirection === 'asc' ? comparison : -comparison;
    }

    // Compare string values
    if (typeof aValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    } else {
      const comparison = aValue - bValue;
      return sortDirection === 'asc' ? comparison : -comparison;
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <UnfoldMore fontSize="small" />;
    }
    return sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  return (
    <div className="player-management">
      <div className="management-header">
        <h2>Gestión de Jugadores</h2>
        <p>Administra los jugadores del sistema. Puedes editar sus datos o eliminarlos.</p>
        
        <div className="view-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar jugador por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="view-toggle">
            <button
              className={viewMode === 'cards' ? 'active' : ''}
              onClick={() => setViewMode('cards')}
            >
              Tarjetas
            </button>
            <button
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >
              Tabla
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="players-table-container">
          {players.length === 0 ? (
            <div className="empty-state">
              <p>No hay jugadores registrados en el sistema.</p>
              <p>Ve a la sección "Sorteo de Equipos" para agregar jugadores.</p>
            </div>
          ) : sortedPlayers.length === 0 ? (
            <div className="empty-state">
              <p>No se encontraron jugadores que coincidan con "{searchTerm}".</p>
            </div>
          ) : (
            <table className="players-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} className="sortable">
                    <div className="th-content">
                      Nombre
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('games')} className="sortable">
                    <div className="th-content">
                      Partidas
                      {getSortIcon('games')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('wins')} className="sortable">
                    <div className="th-content">
                      Victorias
                      {getSortIcon('wins')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('loses')} className="sortable">
                    <div className="th-content">
                      Derrotas
                      {getSortIcon('loses')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('draws')} className="sortable">
                    <div className="th-content">
                      Empates
                      {getSortIcon('draws')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('winrate')} className="sortable">
                    <div  className="th-content">
                      Winrate <br />
                      {getSortIcon('winrate')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('total_kills')} className="sortable">
                    <div className="th-content">
                      Kills Total
                      {getSortIcon('total_kills')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('total_deaths')} className="sortable">
                    <div className="th-content">
                      Deaths Total
                      {getSortIcon('total_deaths')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('kd')} className="sortable">
                    <div className="th-content">
                      K/D
                      {getSortIcon('kd')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('total_damage')} className="sortable">
                    <div className="th-content">
                      Daño Total
                      {getSortIcon('total_damage')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('ave_kills')} className="sortable">
                    <div className="th-content">
                      Kills Promedio
                      {getSortIcon('ave_kills')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('ave_deaths')} className="sortable">
                    <div className="th-content">
                      Deaths Promedio
                      {getSortIcon('ave_deaths')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('ave_damage')} className="sortable">
                    <div className="th-content">
                      Daño Promedio
                      {getSortIcon('ave_damage')}
                    </div>
                  </th>
                  <th className="actions-column">
                    <div className="th-content">
                      Acciones <br />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player) => (
                  <tr key={player.id}>
                    <td>{isEditing === player.id ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="table-input"
                      />
                    ) : (
                      <strong>{player.name}</strong>
                    )}</td>
                    <td>{player.games || '0'}</td>
                    <td>{player.wins || '0'}</td>
                    <td>{player.loses || '0'}</td>
                    <td>{player.draws || '0'}</td>
                    <td>
                      {(() => {
                        const games = Number(player.games) || 0;
                        const wins = Number(player.wins) || 0;
                        const winrate = games > 0 ? (wins / games) * 100 : 0;
                        return `${winrate.toFixed(2)}%`;
                      })()}
                    </td>
                    <td>{player.total_kills || '0'}</td>
                    <td>{player.total_deaths || '0'}</td>
                    <td>{isEditing === player.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.kd}
                        onChange={(e) => handleInputChange('kd', e.target.value)}
                        className="table-input"
                      />
                    ) : (
                      (Number(player.kd) || 0).toFixed(2)
                    )}</td>
                    <td>{isEditing === player.id ? (
                      <input
                        type="number"
                        value={editForm.total_damage}
                        onChange={(e) => handleInputChange('total_damage', e.target.value)}
                        className="table-input"
                      />
                    ) : (
                      player.total_damage || '0'
                    )}</td>
                    <td>{(Number(player.ave_kills) || 0).toFixed(2)}</td>
                    <td>{(Number(player.ave_deaths) || 0).toFixed(2)}</td>
                    <td>{player.ave_damage || '0'}</td>
                    <td className="table-actions">
                      {isEditing === player.id ? (
                        <>
                          <Tooltip title={isLoading ? 'Guardando...' : 'Guardar cambios'}>
                            <IconButton 
                              onClick={handleSaveEdit}
                              disabled={isLoading}
                              size="small"
                              sx={{ 
                                color: 'var(--success)',
                                '&:hover': { backgroundColor: 'var(--success)', color: 'white' }
                              }}
                            >
                              <Save fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancelar edición">
                            <IconButton 
                              onClick={handleCancelEdit}
                              disabled={isLoading}
                              size="small"
                              sx={{ 
                                color: 'var(--text-muted)',
                                '&:hover': { backgroundColor: 'var(--text-muted)', color: 'white' }
                              }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip title="Editar jugador">
                            <IconButton 
                              onClick={() => handleEdit(player)}
                              disabled={isLoading}
                              size="small"
                              sx={{ 
                                color: 'var(--text-primary)',
                                '&:hover': { backgroundColor: 'var(--accent-primary)', color: 'white' }
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar jugador">
                            <IconButton 
                              onClick={() => handleDelete(player.id, player.name)}
                              disabled={isLoading}
                              size="small"
                              sx={{ 
                                color: 'var(--text-primary)',
                                '&:hover': { backgroundColor: 'var(--error)', color: 'white' }
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="players-grid">
          {players.length === 0 ? (
            <div className="empty-state">
              <p>No hay jugadores registrados en el sistema.</p>
              <p>Ve a la sección "Sorteo de Equipos" para agregar jugadores.</p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="empty-state">
              <p>No se encontraron jugadores que coincidan con "{searchTerm}".</p>
            </div>
          ) : (
            filteredPlayers.map((player) => (
            <div key={player.id} className="player-card">
              {isEditing === player.id ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Nombre:</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Nombre del jugador"
                    />
                  </div>
                  <div className="form-group">
                    <label>K/D:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.kd}
                      onChange={(e) => handleInputChange('kd', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Daño Total:</label>
                    <input
                      type="number"
                      value={editForm.total_damage}
                      onChange={(e) => handleInputChange('total_damage', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="edit-actions">
                    <Tooltip title={isLoading ? 'Guardando...' : 'Guardar cambios'}>
                      <IconButton 
                        onClick={handleSaveEdit}
                        disabled={isLoading}
                        size="small"
                        sx={{ 
                          color: 'var(--success)',
                          '&:hover': { backgroundColor: 'var(--success)', color: 'white' }
                        }}
                      >
                        <Save fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancelar edición">
                      <IconButton 
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                        size="small"
                        sx={{ 
                          color: 'var(--text-muted)',
                          '&:hover': { backgroundColor: 'var(--text-muted)', color: 'white' }
                        }}
                      >
                        <Cancel fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              ) : (
                <div className="player-info">
                  <div className="player-header">
                    <h3>{player.name}</h3>
                    <div className="player-actions">
                      <Tooltip title="Editar jugador">
                        <IconButton 
                          onClick={() => handleEdit(player)}
                          disabled={isLoading}
                          size="small"
                          sx={{ 
                            color: 'var(--text-primary)',
                            fontFamily: 'Michroma',

                            '&:hover': { backgroundColor: 'var(--accent-primary)', color: 'white' }
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar jugador">
                        <IconButton 
                          onClick={() => handleDelete(player.id, player.name)}
                          disabled={isLoading}
                          size="small"
                          sx={{ 
                            color: 'var(--text-primary)',
                            fontFamily: 'Michroma',
                            '&:hover': { backgroundColor: 'var(--error)', color: 'white' }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                  
                  <div className="player-stats">
                    <div className="stat-item">
                      <span className="stat-label">K/D:</span>
                      <span className="stat-value">{player.kd || '0.00'}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Daño Total:</span>
                      <span className="stat-value">{player.total_damage || '0'}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Partidas:</span>
                      <span className="stat-value">{player.games || '0'}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Victorias:</span>
                      <span className="stat-value">{player.wins || '0'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        </div>
      )}
      
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

export default PlayerManagement;
