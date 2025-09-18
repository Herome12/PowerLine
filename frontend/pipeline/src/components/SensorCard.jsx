// src/components/SensorCard.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MapModal from './MapModal';

function SensorCard({ node }) {
  const [showMap, setShowMap] = useState(false);
  const isFault = node.relay_status === 'OFF' || node.current === 0;
  const statusClass = isFault ? 'status-fault' : 'status-ok';

  const formattedTimestamp = new Date(node.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <>
      {showMap && <MapModal node={node} onClose={() => setShowMap(false)} />}
      <div className={`sensor-card ${statusClass}`}>
        <Link to={`/node/${node.node_id}`} className="sensor-card-link">
            <div className="card-header">{node.node_id}</div>
            <div className="card-data">
              <p><span>Current:</span>{node.current.toFixed(2)} A</p>
              <p><span>Relay Status:</span>{node.relay_status}</p>
              <p><span>Voltage:</span>{node.voltage_present ? 'Present' : 'Absent'}</p>
            </div>
        </Link>
        <button className="map-button" onClick={() => setShowMap(true)}>Show on Map</button>
        <p className="timestamp">Last updated: {formattedTimestamp}</p>
      </div>
    </>
  );
}

export default SensorCard;