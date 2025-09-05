import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/themes/ThemeProvider";
import AdminLayout from "@/layouts/AdminLayout";
import AdminDashboard from "@/dashboard/pages/AdminDashboard";
import BuildingLicenses from "@/pages/BuildingLicenses";
import SurveyingDecision from "@/pages/SurveyingDecision";
import TechnicalRequirements from "@/pages/TechnicalRequirements";
import LegalSystem from "@/pages/LegalSystem";
import OrganizationalStructure from "@/pages/OrganizationalStructure";
import AdvancedOrganizationalStructure from "@/pages/AdvancedOrganizationalStructure";
import AdvancedAnalytics from "@/pages/AdvancedAnalytics";
import UserManagement from "@/pages/UserManagement";
import DocumentArchive from "@/pages/DocumentArchive";
import SmartSearch from "@/pages/SmartSearch";
import TaskManagement from "@/pages/TaskManagement";
import ServiceBuilder from "@/pages/ServiceBuilder";
import ServiceCatalog from "@/services/pages/ServiceCatalog";
import ServiceDetails from "@/services/pages/ServiceDetails";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={AdminDashboard} />
        <Route path="/building-licenses" component={BuildingLicenses} />
        <Route path="/surveying-decision" component={SurveyingDecision} />
        <Route path="/technical-requirements" component={TechnicalRequirements} />
        <Route path="/legal-system" component={LegalSystem} />
        <Route path="/organizational-structure" component={OrganizationalStructure} />
        <Route path="/advanced-organizational-structure" component={AdvancedOrganizationalStructure} />
        <Route path="/advanced-analytics" component={AdvancedAnalytics} />
        <Route path="/user-management" component={UserManagement} />
        <Route path="/document-archive" component={DocumentArchive} />
        <Route path="/smart-search" component={SmartSearch} />
        <Route path="/task-management" component={TaskManagement} />
        <Route path="/service-builder" component={ServiceBuilder} />
        <Route path="/services" component={ServiceCatalog} />
        <Route path="/services/:id" component={ServiceDetails} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="yemen-platform-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
