import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FleetProvider } from "@/context/FleetContext";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Payments from "./pages/Payments";
import Revisions from "./pages/Revisions";
import Workshop from "./pages/Workshop";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <FleetProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute allowedRoles={["admin"]}><Dashboard /></ProtectedRoute>} />
              <Route path="/veiculos" element={<ProtectedRoute allowedRoles={["admin"]}><Vehicles /></ProtectedRoute>} />
              <Route path="/pagamentos" element={<ProtectedRoute allowedRoles={["admin"]}><Payments /></ProtectedRoute>} />
              <Route path="/revisoes" element={<ProtectedRoute allowedRoles={["admin", "locador"]}><Revisions /></ProtectedRoute>} />
              <Route path="/oficina" element={<ProtectedRoute allowedRoles={["admin", "mecanico"]}><Workshop /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </FleetProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
