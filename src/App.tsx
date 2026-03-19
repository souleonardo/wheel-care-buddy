import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FleetProvider } from "@/context/FleetContext";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Payments from "./pages/Payments";
import Revisions from "./pages/Revisions";
import Workshop from "./pages/Workshop";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FleetProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/veiculos" element={<Vehicles />} />
            <Route path="/pagamentos" element={<Payments />} />
            <Route path="/revisoes" element={<Revisions />} />
            <Route path="/oficina" element={<Workshop />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </FleetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
