import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import App from "./App.jsx";
import SiteFooter
  from "./SiteFooter.jsx";

import "./index.css";


createRoot(
  document.getElementById(
    "root"
  )
).render(
  <StrictMode>
    <App />

    <SiteFooter />
  </StrictMode>
);