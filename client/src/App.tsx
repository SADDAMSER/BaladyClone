import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import BuildingLicenses from "@/pages/BuildingLicenses";
import SurveyingDecision from "@/pages/SurveyingDecision";
import TechnicalRequirements from "@/pages/TechnicalRequirements";
import LegalSystem from "@/pages/LegalSystem";
import OrganizationalStructure from "@/pages/OrganizationalStructure";
import TaskManagement from "@/pages/TaskManagement";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/building-licenses" component={BuildingLicenses} />
      <Route path="/surveying-decision" component={SurveyingDecision} />
      <Route path="/technical-requirements" component={TechnicalRequirements} />
      <Route path="/legal-system" component={LegalSystem} />
      <Route path="/organizational-structure" component={OrganizationalStructure} />
      <Route path="/task-management" component={TaskManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
