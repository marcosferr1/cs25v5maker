import React, { useState } from 'react';

const PlayerForm = ({ onAddPlayer, isLoading, playerCount }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const validateName = (name) => {
    if (!name.trim()) {
      return 'El nombre es requerido';
    }
    if (name.trim().length < 2) {
      return 'El nombre debe tener al menos 2 caracteres';
    }
    if (name.trim().length > 50) {
      return 'El nombre no puede exceder 50 caracteres';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar límite de jugadores
    if (playerCount >= 10) {
      setError('No se pueden agregar más de 10 jugadores');
      return;
    }
    
    const validationError = validateName(name);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    try {
      await onAddPlayer(name.trim());
      setName('');
    } catch (err) {
      setError('Error al agregar el jugador. Intenta nuevamente.');
    }
  };

  const handleChange = (e) => {
    setName(e.target.value);
    if (error) setError(''); // Clear error when user starts typing
  };

  const isDisabled = isLoading || playerCount >= 10;

  return (
    <form onSubmit={handleSubmit} className="player-form">
      <div className="form-group">
        <input
          type="text"
          value={name}
          onChange={handleChange}
          placeholder={playerCount >= 10 ? "Máximo 10 jugadores alcanzado" : "Nombre del jugador"}
          disabled={isDisabled}
          className={error ? 'error' : ''}
        />
        <button type="submit" disabled={isDisabled || !name.trim()}>
          {isLoading ? 'Agregando...' : playerCount >= 10 ? 'Límite alcanzado' : 'Agregar'}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}

    </form>
  );
};

export default PlayerForm;
