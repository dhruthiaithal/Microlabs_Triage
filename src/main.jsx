import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Import the main application component
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

/**
 * The main entry point for the React application.
 * It mounts the App component to the DOM.
 */

// Find the root DOM element defined in index.html (it should be <div id="root"></div>)
const rootElement = document.getElementById('root');

if (rootElement) {
    // Use createRoot to initialize the React 18 application
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            {/* Render the core application component, App.jsx */}
            <App />
        </React.StrictMode>
    );
} else {
    // Log an error if the mount point is missing, which prevents the app from running
    console.error("The root element with ID 'root' was not found in index.html. Cannot mount React application.");
}