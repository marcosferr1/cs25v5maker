import React, { useEffect, useState } from "react";
import PlayerForm from "./components/PlayerForm";
import PlayerList from "./components/PlayerList";
import TeamDrawer from "./components/TeamDrawer";
import TeamDisplay from "./components/TeamDisplay";
import MatchesSection from "./components/MatchesSection";
import PlayersSection from "./components/PlayersSection";
import ThemeToggle from "./components/ThemeToggle";
import { ToastContainer } from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { useConfirmationModal } from "./hooks/useConfirmationModal";
import ConfirmationModal from "./components/ConfirmationModal";

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function App() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [teams, setTeams] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('teams'); // 'teams', 'matches', or 'players'
  const { toasts, removeToast, showError, showSuccess, showInfo } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { modalState, showConfirmation, hideConfirmation, handleConfirm } = useConfirmationModal();

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      setIsLoading(true);
      const response = await fetch(`${API}/api/players`);
      
      if (!response.ok) {
        throw new Error('Error al cargar los jugadores');
      }
      
      const data = await response.json();
      setPlayers(data);
    } catch (err) {
      showError('Error al cargar los jugadores. Verifica que el servidor esté funcionando.');
      console.error('Error fetching players:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function addPlayer(name) {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API}/api/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al agregar el jugador');
      }

      await fetchPlayers();
      showSuccess(`Jugador "${name}" agregado exitosamente`);
    } catch (err) {
      showError(err.message || 'Error al agregar el jugador. Intenta nuevamente.');
      console.error('Error adding player:', err);
      throw err; // Re-throw para que PlayerForm pueda manejarlo
    } finally {
      setIsLoading(false);
    }
  }

  function togglePlayer(id) {
    if (id === 'clear') {
      setSelectedPlayers(new Set());
      return;
    }

    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPlayers(newSelected);
  }

  async function doRandomDraw() {
    await performDraw('random');
  }

  async function doBalanceDraw(metric) {
    await performDraw('balance', metric);
  }

  async function performDraw(type, metric = null) {
    try {
      setIsLoading(true);
      
      const playerIds = Array.from(selectedPlayers);
      
      if (playerIds.length !== 10) {
        throw new Error('Se necesitan exactamente 10 jugadores para formar equipos');
      }

      const body = { playerIds };
      if (metric) {
        body.metric = metric;
      }

      console.log('Sending draw request:', { type, body, playerIds }); // Debug log

      const response = await fetch(`${API}/api/draw/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      console.log('Response status:', response.status); // Debug log

      if (!response.ok) {
        let errorMessage = 'Error al realizar el sorteo';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Backend error:', errorData); // Debug log
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Draw response:', data); // Debug log
      
      if (!data || !data.teamA || !data.teamB) {
        console.error('Invalid response structure:', data);
        throw new Error('Respuesta inválida del servidor');
      }

      if (!Array.isArray(data.teamA) || !Array.isArray(data.teamB)) {
        console.error('Teams are not arrays:', { teamA: data.teamA, teamB: data.teamB });
        throw new Error('Los equipos no tienen el formato correcto');
      }

      setTeams(data);
      showSuccess(`Equipos generados exitosamente (${type === 'random' ? 'aleatorio' : 'balanceado por ' + metric})`);
    } catch (err) {
      showError(err.message || 'Error al realizar el sorteo');
      console.error('Error performing draw:', err);
      // Clear teams on error to prevent rendering issues
      setTeams(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewDraw() {
    setTeams(null);
    setSelectedPlayers(new Set());
  }

  const handleClearAllPlayers = () => {
    showConfirmation({
      title: 'Limpiar Selección',
      message: '¿Estás seguro de que quieres deseleccionar todos los jugadores? Esto cancelará cualquier sorteo pendiente.',
      confirmText: 'Limpiar',
      cancelText: 'Cancelar',
      type: 'warning',
      onConfirm: () => {
        setSelectedPlayers(new Set());
        showSuccess('Selección limpiada');
      }
    });
  };

  return (
    <ErrorBoundary>
      <div className="container">
        <div className="app-header">
          <h1>CS2 5v5 Maker</h1>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        <div className="main-navigation">
          <div className="nav-tabs">
            <button 
              className={activeSection === 'teams' ? 'active' : ''}
              onClick={() => setActiveSection('teams')}
            >
          Sorteo de Equipos
            </button>
            <button 
              className={activeSection === 'players' ? 'active' : ''}
              onClick={() => setActiveSection('players')}
            >
             Jugadores
            </button>
            <button 
              className={activeSection === 'matches' ? 'active' : ''}
              onClick={() => setActiveSection('matches')}
            >
             Partidas
            </button>
          </div>
        </div>

        <div className="main-content">
          {activeSection === 'teams' && (
            <div className="columns">
              <div>
                <h2>Jugadores</h2>
                <PlayerForm onAddPlayer={addPlayer} isLoading={isLoading} playerCount={players.length} />
                <PlayerList 
                  players={players}
                  selectedPlayers={selectedPlayers}
                  onTogglePlayer={togglePlayer}
                  isLoading={isLoading}
                />
              </div>

              <div>
                <TeamDrawer 
                  selectedCount={selectedPlayers.size}
                  onRandomDraw={doRandomDraw}
                  onBalanceDraw={doBalanceDraw}
                  isLoading={isLoading}
                  totalPlayers={players.length}
                />
                
                <ErrorBoundary>
                  <TeamDisplay 
                    teams={teams}
                    onNewDraw={handleNewDraw}
                  />
                </ErrorBoundary>
              </div>
            </div>
          )}

          {activeSection === 'players' && (
            <ErrorBoundary>
              <PlayersSection />
            </ErrorBoundary>
          )}

          {activeSection === 'matches' && (
            <MatchesSection 
              players={players}
              lastTeams={teams}
            />
          )}
        </div>
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
    </ErrorBoundary>
  );
}

export default App;
