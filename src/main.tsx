/**
 * ==============================================================================
 * UNIMART APPLICATION ENTRY POINT (main.tsx)
 * ==============================================================================
 * This is the very first file that executes in the browser when the app loads.
 *
 * What happens here:
 * 1. React DOM imports createRoot, which connects React to the HTML document.
 * 2. It finds the HTML element with id="root" inside index.html.
 * 3. It imports global styles (Tailwind CSS, fonts, theme colors) via index.css.
 * 4. It renders the root <App /> component into the DOM tree.
 * ==============================================================================
 */

import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// Locate the root DOM node from index.html and mount the React application
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find the root element. Please check index.html.");
}

createRoot(rootElement).render(<App />);