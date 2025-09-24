import { useState, useEffect, useRef } from 'react';
import SensorCard from '../components/SensorCard';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const API_URL = 'http://localhost:5000/api/data';
const SOCKET_URL = 'http://localhost:5000';

function ProctoredLive() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevNodesRef = useRef();
  const socketRef = useRef(null);

  // 🔥 Alert cooldown tracking
  const lastAlertTimeRef = useRef({});
  const ALERT_COOLDOWN = 60 * 1000; // 1 minute (adjust as needed)

  // --- Deduplicate nodes ---
  const removeDuplicatesByNodeId = (data) => {
    if (!Array.isArray(data)) return data;
    const uniqueNodes = [];
    const seenNodeIds = new Set();
    for (let i = data.length - 1; i >= 0; i--) {
      const node = data[i];
      const nodeId = node.nodeId || node.node_id;
      if (nodeId && !seenNodeIds.has(nodeId)) {
        seenNodeIds.add(nodeId);
        uniqueNodes.unshift(node);
      }
    }
    return uniqueNodes;
  };

  // --- Resolve Alert ---
  const resolveAlert = (breakdownData, toastId) => {
    console.log('Resolving alert for:', breakdownData);
    if (socketRef.current) {
      socketRef.current.emit('resolve-fault', breakdownData);
    }
    toast.dismiss(toastId);
    toast.success(
      `✅ Resolve command sent for Issue ID: ${breakdownData.issueID || breakdownData.node_id}`
    );
  };

  // --- Socket Setup ---
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on('connect', () => console.log('🔌 Connected to Socket.IO server'));
    socket.on('disconnect', () => console.log('🔌 Disconnected from Socket.IO server'));

    socket.on('new-breakdown', (breakdownData) => {
      console.log('🚨 New breakdown received:', breakdownData);

      const nodeId = breakdownData.node_id || breakdownData.outNodeID;
      const now = Date.now();

      // 🔥 Check cooldown before raising new alert
      if (!lastAlertTimeRef.current[nodeId] || now - lastAlertTimeRef.current[nodeId] > ALERT_COOLDOWN) {
        lastAlertTimeRef.current[nodeId] = now;

        const toastId = toast.error(
          <div>
            <div>
              🚨 BREAKDOWN: Node {breakdownData.outNodeID || breakdownData.node_id} | Issue:{' '}
              {breakdownData.issueID || breakdownData.breakdown_message}
            </div>
            <button
              onClick={() => resolveAlert(breakdownData, toastId)}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              ✅ Resolve
            </button>
          </div>,
          {
            position: 'top-right',
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
          }
        );
      } else {
        console.log(`⏳ Alert suppressed for node ${nodeId} (still in cooldown).`);
      }
    });

    return () => {
      socket.disconnect();
      console.log('🔌 Socket connection cleaned up');
    };
  }, []);

  // --- Relay Fault Detection ---
  useEffect(() => {
    const prevNodes = prevNodesRef.current;
    if (prevNodes) {
      nodes.forEach((newNode) => {
        const prevNode = prevNodes.find((p) => p._id === newNode._id);
        if (prevNode && prevNode.relay_status !== 'OFF' && newNode.relay_status === 'OFF') {
          const now = Date.now();
          const nodeId = newNode.node_id;

          // 🔥 Apply cooldown to relay alerts too
          if (!lastAlertTimeRef.current[nodeId] || now - lastAlertTimeRef.current[nodeId] > ALERT_COOLDOWN) {
            lastAlertTimeRef.current[nodeId] = now;
            toast.error(`🚨 Fault Detected: Relay for Node ${nodeId} is OFF!`);
          } else {
            console.log(`⏳ Relay alert suppressed for node ${nodeId} (still in cooldown).`);
          }
        }
      });
    }
    prevNodesRef.current = nodes;
  }, [nodes]);

  // --- Polling Data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        const uniqueData = removeDuplicatesByNodeId(data);
        setNodes(uniqueData);
        setError(null);
      } catch (err) {
        setError('Failed to fetch data. Is the backend server running?');
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
          {nodes.map((node) => (
            <SensorCard key={node._id} node={node} />
          ))}
        </div>
      )}
    </>
  );
}

export default ProctoredLive;
