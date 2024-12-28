import React from "react";
import ReactDOM from "react-dom/client"; // Update this import for React 18
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css"; // Bootstrap CSS

// Use createRoot instead of render (for React 18+)
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
