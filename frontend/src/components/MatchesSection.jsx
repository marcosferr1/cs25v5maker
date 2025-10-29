import React, { useState } from 'react';
import MatchForm from './MatchForm';
import MatchList from './MatchList';
import MatchDetails from './MatchDetails';
import EditMatchModal from './EditMatchModal';
import CsvUploadModal from './CsvUploadModal';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const MatchesSection = ({ players, lastTeams }) => {
  const [activeTab, setActiveTab] = useState('form'); // 'form' or 'list'
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toasts, removeToast, showSuccess, showError } = useToast();

  const handleSaveMatch = async (teams) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API}/api/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la partida');
      }

      const result = await response.json();
      showSuccess('Partida guardada exitosamente!');
      
      // Switch to list tab to show the new match
      setActiveTab('list');
      
    } catch (err) {
      showError('Error al guardar la partida: ' + err.message);
      console.error('Error saving match:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMatch = (matchId) => {
    setSelectedMatchId(matchId);
  };

  const handleCloseDetails = () => {
    setSelectedMatchId(null);
  };

  const handleEditMatch = (matchId) => {
    setEditingMatchId(matchId);
  };

  const handleCloseEdit = () => {
    setEditingMatchId(null);
  };

  const handleSaveEdit = async (teams) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API}/api/matches/${editingMatchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar la partida');
      }

      showSuccess('Partida actualizada exitosamente!');
      setEditingMatchId(null);
      
    } catch (err) {
      showError('Error al actualizar la partida: ' + err.message);
      console.error('Error updating match:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API}/api/matches/${matchId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar la partida');
      }

      showSuccess('Partida eliminada exitosamente!');
      
    } catch (err) {
      showError('Error al eliminar la partida: ' + err.message);
      console.error('Error deleting match:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvMatchCreated = () => {
    // Switch to list tab to show the new match
    setActiveTab('list');
  };

  return (
    <div className="matches-section">
      <div className="section-header">
        <h2>Partidas</h2>
        <div className="header-actions">
          <button 
            className="tab-buttons"
            onClick={() => setShowCsvUpload(true)}
            title="Subir partida desde CSV"
            style={{
              padding: "10px 20px" , marginBottom: "10px" ,
              border: "2px solid var(--accent-primary)" ,
              background: !showCsvUpload ?   "transparent" : "var(--accent-primary)",

              color: !showCsvUpload ?   "var(--accent-primary)" : "black",
              borderRadius: "8px" ,
              cursor: "pointer" ,
              fontSize: "14px" ,
              fontFamily: "Michroma, sans-serif" ,
              fontWeight: "400" ,
              textTransform: "uppercase" ,
              letterSpacing: "0.5px" ,
              transition: "all 0.3s ease" ,
              boxShadow: "0 2px 4px var(--shadow)" ,
              width: "100%" ,
              maxWidth: "200px" ,
              textAlign: "center" ,
              display: "flex" ,
              alignItems: "center" ,
              justifyContent: "center" ,
              gap: "10px" ,
              height: "40px" ,
              width: "100%" ,
              maxWidth: "200px" ,
              textAlign: "center" ,
              display: "flex" ,
              alignItems: "center" ,
              justifyContent: "center" ,
              
        
            }}
          >
           Subir CSV
          </button>
          <div className="tab-buttons">
            <button 
              className={activeTab === 'form' ? 'active' : ''}
              onClick={() => setActiveTab('form')}
            >
              Nueva Partida
            </button>
            <button 
              className={activeTab === 'list' ? 'active' : ''}
              onClick={() => setActiveTab('list')}
            >
              Historial
            </button>
          </div>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'form' && (
          <MatchForm 
            players={players}
            lastTeams={lastTeams}
            onSaveMatch={handleSaveMatch}
            isLoading={isLoading}
          />
        )}
        
        {activeTab === 'list' && (
          <MatchList 
            onViewMatch={handleViewMatch}
            onEditMatch={handleEditMatch}
            onDeleteMatch={handleDeleteMatch}
          />
        )}
      </div>

      {selectedMatchId && (
        <MatchDetails 
          matchId={selectedMatchId}
          onClose={handleCloseDetails}
        />
      )}

      {editingMatchId && (
        <EditMatchModal 
          matchId={editingMatchId}
          onClose={handleCloseEdit}
          onSave={handleSaveEdit}
          isLoading={isLoading}
        />
      )}

      {showCsvUpload && (
        <CsvUploadModal
          isOpen={showCsvUpload}
          onClose={() => setShowCsvUpload(false)}
          onMatchCreated={handleCsvMatchCreated}
        />
      )}
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default MatchesSection;
