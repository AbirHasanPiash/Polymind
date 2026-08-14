import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { GOOGLE_CLIENT_ID } from "./lib/env.ts";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error('Root element "#root" is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      {/* The client id is public, but it belongs in configuration so staging and
          production can point at different OAuth clients. */}
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
