// src/pages/DashboardPage.jsx
import { useState, useEffect, useRef } from 'react'; // 1. Import useRef
import SensorCard from '../components/SensorCard';
import { toast } from 'react-toastify'; // 2. Import toast

const API_URL = 'http://localhost:5000/api/data';

function ProctoredLive() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevNodesRef = useRef(); // 3. Create a ref to store previous data

  // This effect runs whenever 'nodes' state changes, to check for new alerts
  useEffect(() => {
    // Get the previous nodes data from the ref
    const prevNodes = prevNodesRef.current;
    
    // If we have previous data to compare against
    if (prevNodes) {
      // Check each new node against its previous state
      nodes.forEach(newNode => {
        const prevNode = prevNodes.find(p => p._id === newNode._id);
        
        // If the status has changed from something else TO "OFF"
        if (prevNode && prevNode.relay_status !== 'OFF' && newNode.relay_status === 'OFF') {
          // Trigger an error toast notification
          toast.error(`🚨 Fault Detected: Relay for Node ${newNode.node_id} is OFF!`);
        }
      });
    }

    // After checking, update the ref to store the current nodes for the next comparison
    prevNodesRef.current = nodes;
  }, [nodes]); // This effect depends on the 'nodes' state

  // The existing useEffect for fetching data remains the same
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        setNodes(data);
        setError(null);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to fetch data. Please check the backend connection and URL.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // The JSX return statement remains the same
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
          {nodes.map((node) => (
            <SensorCard key={node._id} node={node} />
          ))}
        </div>
      )}
    </>
  );
}

export default ProctoredLive;