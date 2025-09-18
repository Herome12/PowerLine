// src/pages/NodeDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register( CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale );

const API_BASE_URL = 'http://localhost:5000/api/data/history';

function NodeDetailPage() {
  const { nodeId } = useParams();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/${nodeId}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        const formattedData = {
          labels: data.map(d => new Date(d.timestamp)),
          datasets: [{
            label: 'Current (A)',
            data: data.map(d => d.current),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            fill: true,
            tension: 0.4,
          }],
        };
        setChartData(formattedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [nodeId]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#f9fafb' } },
      title: { display: true, text: `Current (A) - Last 24 Hours`, color: '#f9fafb', font: { size: 18 } },
    },
    scales: {
      x: { type: 'time', time: { unit: 'hour' }, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
      y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
    },
  };

  if (loading) return <p className="loading-message">Loading chart data...</p>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/dashboard" style={{ color: '#3b82f6', marginBottom: '2rem', display: 'inline-block' }}>
        &larr; Back to Dashboard
      </Link>
      <h1 style={{ marginBottom: '1rem' }}>Historical Data for Node: {nodeId}</h1>
      <div style={{ height: '60vh', backgroundColor: '#1f2937', padding: '1rem', borderRadius: '12px' }}>
        {chartData ? <Line options={chartOptions} data={chartData} /> : <p>No data to display.</p>}
      </div>
    </div>
  );
}

export default NodeDetailPage;