import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';

const API = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const AddPlayerForm = ({ onPlayerAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    kd: '',
    total_damage: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useToast();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showError('El nombre es requerido');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API}/api/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          kd: parseFloat(formData.kd) || 0,
          total_damage: parseInt(formData.total_damage) || 0
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al agregar jugador');
      }

      showSuccess(`${formData.name} agregado exitosamente`);
      setFormData({ name: '', kd: '', total_damage: '' });
      onPlayerAdded(); // Refrescar la lista
    } catch (error) {
      showError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-player-form">
      <h3>Agregar Nuevo Jugador</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nombre del Jugador:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ej: PlayerName"
            required
          />
        </div>
        
        <div className="form-group">
          <label>K/D Ratio (opcional):</label>
          <input
            type="number"
            step="0.01"
            value={formData.kd}
            onChange={(e) => handleInputChange('kd', e.target.value)}
            placeholder="1.25"
          />
        </div>
        
        <div className="form-group">
          <label>Daño Total (opcional):</label>
          <input
            type="number"
            value={formData.total_damage}
            onChange={(e) => handleInputChange('total_damage', e.target.value)}
            placeholder="15000"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading || !formData.name.trim()}
          className="add-btn"
        >
          {isLoading ? 'Agregando...' : 'Agregar Jugador'}
        </button>
      </form>
    </div>
  );
};

export default AddPlayerForm;
