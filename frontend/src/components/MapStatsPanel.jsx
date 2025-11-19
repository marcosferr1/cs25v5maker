import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_BASE 
const VITE_BASE = import.meta.env.VITE_BASE
const MapStatsPanel = () => {
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [mapDetails, setMapDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API}/api/maps`);
      if (!response.ok) {
        throw new Error('Error al cargar mapas');
      }
      const data = await response.json();
      setMaps(data);
    } catch (error) {
      console.error('Error fetching maps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMapDetails = async (mapId) => {
    // Abrir el modal inmediatamente con loader para una transición suave
    setSelectedMap(mapId);
    setMapDetails(null);
    try {
      setIsLoadingDetails(true);
      const response = await fetch(`${API}/api/maps/${mapId}/stats`);
      if (!response.ok) {
        throw new Error('Error al cargar detalles del mapa');
      }
      const data = await response.json();
      setMapDetails(data);
    } catch (error) {
      console.error('Error fetching map details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeMapDetails = () => {
    setSelectedMap(null);
    setMapDetails(null);
  };

  const getMapImage = (mapSlug) => {
    return `${VITE_BASE}assets/mapPool/${mapSlug}.webp`;
  };

  if (isLoading) {
    return (
      <div className="map-stats-panel">
        <div className="loading">
          <p>Cargando mapas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-stats-panel">
      <div className="map-stats-header">
        <h2>Mapas</h2>
        <button onClick={fetchMaps} style={{
          padding: "10px 20px" , marginBottom: "10px" ,
        }} className="refresh-button">
          Actualizar
        </button>
      </div>

      <div style={{
        display: "grid" ,
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" ,
        gap: "10px" ,
        
      }}>
        {maps.map((map) => (
          <div 
            key={map.id}
            className=""
            onClick={() => fetchMapDetails(map.id)}
            style={{ backgroundColor: "var(--bg-primary)" ,
              border: "1px solid var(--border-color)" ,
              borderRadius: "10px" ,
              padding: "10px" ,
              marginBottom: "10px" ,
              cursor: "pointer" ,
              transition: "all 0.3s ease" ,
              boxShadow: "0 2px 4px var(--shadow)" ,
              width: "300px" ,
              height: "300px" ,
              backgroundSize: "cover" ,
              backgroundPosition: "center" ,
              backgroundRepeat: "no-repeat" ,
              backgroundImage: `url(${getMapImage(map.map_slug)})` ,
              border: "1px solid var(--border-color)"
            }}
          
          >
            <div className=""></div>
            <div className="">
              <div className="">{map.map_name}</div>
              <div className="">
                {map.match_count || 0} {map.match_count === 1 ? 'partida' : 'partidas'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedMap && (
        <MapDetailsModal
          mapDetails={mapDetails}
          isLoading={isLoadingDetails}
          onClose={closeMapDetails}
          getMapImage={getMapImage}
        />
      )}
    </div>
  );
};

const MapDetailsModal = ({ mapDetails, isLoading, onClose, getMapImage }) => {
  const getWinrateColor = (winrate) => {
    if (!winrate && winrate !== 0) return 'var(--text-muted)';
    if (winrate >= 60) return 'var(--success)';
    if (winrate >= 50) return 'var(--info)';
    if (winrate >= 40) return 'var(--warning)';
    return 'var(--error)';
  };

  // Solo mostrar contenido cuando NO está cargando Y tiene datos
  const showContent = !isLoading && mapDetails;

  return (
    <div className="map-details-modal" onClick={onClose}>
      <div className="map-details-content" onClick={(e) => e.stopPropagation()}>
        {isLoading || !mapDetails ? (
          <div className="map-details-loading">
            <div className="loading-spinner"></div>
            <p>Cargando detalles del mapa...</p>
          </div>
        ) : showContent ? (
          <>


            <div className="map-details-body">
              <div style={{ position: "relative" }}>
                <img src={getMapImage(mapDetails.map.map_slug)} alt="" style={{ }} />
                <span style={{ padding: "10px",color: 'white' , backgroundColor: "black", position: "absolute", bottom: 0, left: 0 }}>{mapDetails.map.map_name}</span>
              </div>
              <div className="map-highlights">
                {mapDetails.best_player ? (
                  <div className="highlight-card best">
                    <div style={{
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Mejor Jugador</div>
                    <div className="highlight-name">{mapDetails.best_player.name}</div>
                    <div className="highlight-stat">
                      {mapDetails.best_player.winrate}% Winrate ({mapDetails.best_player.wins}W / {mapDetails.best_player.total_games}G)
                      {mapDetails.best_player.avg_kd && ` • ${parseFloat(mapDetails.best_player.avg_kd || 0).toFixed(2)} K/D`}
                    </div>
                  </div>
                ) : (
                  <div className="highlight-card best" style={{ opacity: 0.5 }}>
                    <div className="highlight-label">Mejor Jugador</div>
                    <div className="highlight-name">-</div>
                    <div className="highlight-stat">Sin datos</div>
                  </div>
                )}

                {mapDetails.highest_kd ? (
                  <div className="highlight-card kd">
                    <div style={{
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Mayor K/D</div>
                    <div className="highlight-name">{mapDetails.highest_kd.name}</div>
                    <div className="highlight-stat">
                      {parseFloat(mapDetails.highest_kd.avg_kd || 0).toFixed(2)} K/D ({mapDetails.highest_kd.total_kills}K / {mapDetails.highest_kd.total_deaths}D)
                    </div>
                  </div>
                ) : (
                  <div className="highlight-card kd" style={{ opacity: 0.5 }}>
                    <div style={{
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Mayor K/D</div>
                    <div className="highlight-name">-</div>
                    <div className="highlight-stat">Sin datos</div>
                  </div>
                )}

                {mapDetails.most_kills ? (
                  <div className="highlight-card kills">
                    <div style={{
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Más Kills</div>
                    <div className="highlight-name">{mapDetails.most_kills.name}</div>
                    <div className="highlight-stat">
                      {mapDetails.most_kills.total_kills} kills totales ({parseFloat(mapDetails.most_kills.avg_kills || 0).toFixed(1)} avg)
                    </div>
                  </div>
                ) : (
                  <div className="highlight-card kills" style={{ opacity: 0.5 }}>
                    <div style={{
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Más Kills</div>
                    <div className="highlight-name">-</div>
                    <div className="highlight-stat">Sin datos</div>
                  </div>
                )}

                {mapDetails.most_deaths ? (
                  <div className="highlight-card deaths">
                    <div style={{
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Más Muertes</div>
                    <div className="highlight-name">{mapDetails.most_deaths.name}</div>
                    <div className="highlight-stat">
                      {mapDetails.most_deaths.total_deaths} muertes totales ({parseFloat(mapDetails.most_deaths.avg_deaths || 0).toFixed(1)} avg)
                    </div>
                  </div>
                ) : (
                  <div className="highlight-card deaths" style={{ opacity: 0.5 }}>
                    <div style={{
                      textTransform: 'uppercase',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Más Muertes</div>
                    <div className="highlight-name">-</div>
                    <div className="highlight-stat">Sin datos</div>
                  </div>
                )}

                {mapDetails.most_damage ? (
                  <div className="highlight-card damage">
                    <div style={{
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Mayor Daño Promedio</div>
                    <div className="highlight-name">{mapDetails.most_damage.name}</div>
                    <div className="highlight-stat">
                      {parseInt(mapDetails.most_damage.avg_damage || 0)} daño promedio
                    </div>
                  </div>
                ) : (
                  <div className="highlight-card damage" style={{ opacity: 0.5 }}>
                    <div style={{
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Mayor Daño Promedio</div>
                    <div className="highlight-name">-</div>
                    <div className="highlight-stat">Sin datos</div>
                  </div>
                )}

                {mapDetails.worst_player ? (
                  <div className="highlight-card worst">
                    <div style={{
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Peor Jugador</div>
                    <div className="highlight-name">{mapDetails.worst_player.name}</div>
                    <div className="highlight-stat">
                      {mapDetails.worst_player.winrate}% Winrate ({mapDetails.worst_player.wins}W / {mapDetails.worst_player.total_games}G)
                    </div>
                  </div>
                ) : (
                  <div className="highlight-card worst" style={{ opacity: 0.5 }}>
                    <div style={{
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                    }} className="highlight-label">Peor Jugador</div>
                    <div className="highlight-name">-</div>
                    <div className="highlight-stat">Sin datos</div>
                  </div>
                )}
              </div>

              <div className="map-players-list">

                <h3>Todos los Jugadores</h3>
                <div className="players-stats-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Jugador</th>
                        <th>Partidas</th>
                        <th>Winrate</th>
                        <th>K/D</th>
                        <th>Daño Avg</th>
                        <th>W/L/D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mapDetails.all_players.map((player) => (
                        <tr key={player.player_id}>
                          <td><strong>{player.player_name}</strong></td>
                          <td>{player.total_games}</td>
                          <td style={{ color: getWinrateColor(player.winrate) }}>
                            {player.winrate}%
                          </td>
                          <td>{player.avg_kd.toFixed(2)}</td>
                          <td>{player.avg_damage}</td>
                          <td>
                            <span style={{ color: 'var(--success)' }}>{player.wins}W</span> / 
                            <span style={{ color: 'var(--error)' }}> {player.losses}L</span>
                            {player.draws > 0 && <span style={{ color: 'var(--warning)' }}> / {player.draws}D</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No hay estadísticas disponibles para este mapa.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapStatsPanel;

