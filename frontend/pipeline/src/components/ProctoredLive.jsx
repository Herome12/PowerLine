// src/pages/DashboardPage.jsx
import { useState, useEffect, useRef } from 'react';
import SensorCard from '../components/SensorCard';
import { toast } from 'react-toastify';

// ‼️ IMPORTANT: Make sure this URL points to your running backend!
const API_URL = 'http://localhost:5000/api/data';

function ProctoredLive() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevNodesRef = useRef();

  useEffect(() => {
    const prevNodes = prevNodesRef.current;
    if (prevNodes) {
      nodes.forEach(newNode => {
        const prevNode = prevNodes.find(p => p._id === newNode._id);
        if (prevNode && prevNode.relay_status !== 'OFF' && newNode.relay_status === 'OFF') {
          toast.error(`🚨 Fault Detected: Relay for Node ${newNode.node_id} is OFF!`);
        }
      });
    }
    prevNodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        setNodes(data);
        setError(null);
      } catch (err) {
        setError("Failed to fetch data. Is the backend server running?");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <div className="header-container">
        <h1>⚡ Powerline Monitoring Dashboard</h1>
        <p className="tagline">Real-time sensor data from the grid</p>
      </div>
      {loading && <p className="loading-message">Loading sensor data...</p>}
      {error && <div className="error-message">{error}</div>}
      {!loading && !error && (
        <div className="dashboard-grid">
          {nodes.map((node) => ( <SensorCard key={node._id} node={node} /> ))}
        </div>
      )}
    </>
  );
}

export default ProctoredLive;