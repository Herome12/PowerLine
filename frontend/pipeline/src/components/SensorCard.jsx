// src/components/SensorCard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function SensorCard({ node }) {
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  const isFault = (node.relay === 'OFF' || node.relay === 'OFF') || node.current === 0;
  const statusClass = isFault ? 'status-fault' : 'status-ok';

  const formattedTimestamp = new Date(node.timestamp).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // 🔥 API call करके location fetch करो
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setLocationLoading(true);
        const nodeId = node.nodeId || node.node_id;
        
        const response = await fetch(`http://localhost:5000/api/location/${nodeId}`);
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setLocation({
              latitude: result.data.latitude,
              longitude: result.data.longitude
            });
          } else {
            setLocation(null);
          }
        } else {
          console.log(`No location found for node: ${nodeId}`);
          setLocation(null);
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        setLocation(null);
      } finally {
        setLocationLoading(false);
      }
    };

    fetchLocation();
  }, [node.nodeId, node.node_id]);

  const openGoogleMaps = () => {
    // 🔥 API से मिले location use करो
    if (location && location.latitude && location.longitude) {
      const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      window.open(url, '_blank');
    } else {
      alert('Location coordinates not available for this node.');
    }
  };

  return (
    <div className={`sensor-card ${statusClass}`}>
      <Link to={`/node/${node.node_id || node.nodeId}`} className="sensor-card-link">
        <div className="card-header">{node.node_id || node.nodeId}</div>
        <div className="card-data">
          <p><span>Current:</span>{node.current.toFixed(2)} A</p>
          <p><span>Relay Status:</span>{node.relay_status || node.relay}</p>
          <p><span>Voltage:</span>{node.voltage ? 'Present' : 'Absent'}</p>
        </div>
      </Link>
      
      <button 
        className="map-button" 
        onClick={openGoogleMaps}
        disabled={locationLoading || !location}
      >
        {locationLoading ? 'Loading...' : location ? 'Show on Map' : 'No Location'}
      </button>
      
      <p className="timestamp">Last updated: {formattedTimestamp}</p>
    </div>
  );
}

export default SensorCard;
