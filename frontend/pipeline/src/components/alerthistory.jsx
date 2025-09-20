// src/components/AlertHistoryPage.jsx
import React, { useState, useEffect } from 'react';
import './alerthistory.css';

function AlertHistoryPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      // Call your actual API endpoint
      const response = await fetch('http://localhost:5000/api/alerts');
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setAlerts(data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setError('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (loading) {
    return (
      <div className="alert-history-container">
        <div className="loading">Loading alerts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-history-container">
        <div className="error-message">{error}</div>
        <button onClick={fetchAlerts} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="alert-history-container">
      <div className="alert-history-header">
        <h1>🚨 Breakdown Alert History</h1>
        <p className="total-count">Total Alerts: {alerts.length}</p>
        <button onClick={fetchAlerts} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="alerts-table-container">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <h3>No breakdown alerts found</h3>
            <p>The system is running smoothly! 🟢</p>
          </div>
        ) : (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Out Node ID</th>
                <th>In Node ID</th>
                <th>Issue ID</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, index) => (
                <tr key={alert._id} className="alert-row">
                  <td>{index + 1}</td>
                  <td className="node-id">{alert.outNodeID}</td>
                  <td className="node-id">{alert.inNodeID}</td>
                  <td className="issue-id">{alert.issueID}</td>
                  <td className="timestamp">
                    {formatDate(alert.createdAt || alert.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AlertHistoryPage;
