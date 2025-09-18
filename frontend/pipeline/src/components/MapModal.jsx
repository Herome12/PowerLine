// src/components/MapModal.jsx
import React from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import './MapModal.css';

function MapModal({ node, onClose }) {
  const position = { lat: node.gps.lat, lng: node.gps.lon };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Location for {node.node_id}</h3>
        <Map
          style={{ width: '100%', height: '400px' }}
          defaultCenter={position}
          defaultZoom={15}
          mapId="powerline-map"
        >
          <AdvancedMarker position={position} />
        </Map>
        <button className="close-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default MapModal;