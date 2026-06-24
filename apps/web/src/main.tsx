import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ConsoleApp } from "@/console/ConsoleApp";
import { App } from "@/pages/App";
import { useAppStore } from "@/store";
import "./styles.css";

if (import.meta.env.DEV) {
  (window as unknown as { __junoStore?: typeof useAppStore }).__junoStore = useAppStore;
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<ConsoleApp />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
