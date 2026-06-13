import { Navigate, Route, Routes } from "react-router-dom";
import { ConsoleAuthProvider, useConsoleAuth } from "./AuthContext";
import { ConsoleShell } from "./ConsoleShell";
import { CostPage } from "./pages/CostPage";
import { CurationPage } from "./pages/CurationPage";
import { DatasetsPage } from "./pages/DatasetsPage";
import { FunnelPage } from "./pages/FunnelPage";
import { LatencyPage } from "./pages/LatencyPage";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { PipelinePage } from "./pages/PipelinePage";
import { PricingPage } from "./pages/PricingPage";
import { QualityPage } from "./pages/QualityPage";
import { SessionDetailPage } from "./pages/SessionDetailPage";
import { SessionsPage } from "./pages/SessionsPage";
import { TraceDetailPage } from "./pages/TraceDetailPage";

export function ConsoleApp() {
  return (
    <ConsoleAuthProvider>
      <ConsoleRouter />
    </ConsoleAuthProvider>
  );
}

function ConsoleRouter() {
  const auth = useConsoleAuth();
  if (auth.status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--color-console-canvas)] text-muted text-sm">
        Loading console...
      </div>
    );
  }
  if (auth.status === "anon") {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    );
  }
  return (
    <ConsoleShell>
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/:id" element={<SessionDetailPage />} />
        <Route path="turns/:id" element={<TraceDetailPage />} />
        <Route path="cost" element={<CostPage />} />
        <Route path="latency" element={<LatencyPage />} />
        <Route path="quality" element={<QualityPage />} />
        <Route path="funnel" element={<FunnelPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="curation" element={<CurationPage />} />
        <Route path="datasets" element={<DatasetsPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="login" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </ConsoleShell>
  );
}
