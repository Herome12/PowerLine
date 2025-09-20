// src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';
import { toast } from 'react-toastify';

function HomePage() {
   const notify = () => {
    console.log("Button clicked, trying to show toast..."); // <-- Add this line
    toast.success("This is a toast notification!");
  };
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>⚡ Powerline Monitoring System</h1>
        <p className="tagline">
          Monitor your grid with real-time, intelligent fault detection.
        </p>
        <Link to="/dashboard" className="cta-button">
          View Live Dashboard
        </Link>
        
         <Link to="/alerts" className="cta-button">
          View Breakdown History
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
