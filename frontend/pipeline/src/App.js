// src/App.js
import React from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { APIProvider } from "@vis.gl/react-google-maps";
import { ToastContainer } from "react-toastify"; // 1. Import ToastContainer
import "react-toastify/dist/ReactToastify.css"; // 2. Import the CSS

import HomePage from "./components/Home.jsx";
import DashboardPage from "./components/ProctoredLive.jsx";
import NodeDetailPage from "./components/NodeDetailPage.jsx";

const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

if (!googleMapsApiKey) {
  console.error("⚠️ Google Maps API key is missing! Add REACT_APP_GOOGLE_MAPS_API_KEY in your .env file.");
}

// A layout component that renders children
function Layout() {
  return (
    <div>
      {/* Nested routes will appear here */}
      <Outlet />

      {/* 3. Add the ToastContainer component here */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <div>Something went wrong!</div>,
    children: [
      { index: true, element: <HomePage /> },
      { path: "dashboard", element: <DashboardPage /> },
       {
        path: 'node/:nodeId',
        element: <NodeDetailPage />,
      },
    ],
  },
]);

export default function App() {
  return (
    <APIProvider apiKey={googleMapsApiKey}>
      <RouterProvider router={router} />
    </APIProvider>
  );
}