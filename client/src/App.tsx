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
import GeographicDataManager from "@/pages/GeographicDataManager";
import DocumentArchive from "@/pages/DocumentArchive";
import SmartSearch from "@/pages/SmartSearch";
import TaskManagement from "@/pages/TaskManagement";
import ServiceBuilder from "@/pages/ServiceBuilder";
import ServiceCatalog from "@/services/pages/ServiceCatalog";
import ServiceDetails from "@/services/pages/ServiceDetails";
import ServiceApplication from "@/services/pages/ServiceApplication";
import ApplicationTrackingAdmin from "@/applications/pages/ApplicationTracking";
import PendingApplications from "@/applications/pages/PendingApplications";
import SurveyingDecisionForm from "@/services/pages/SurveyingDecisionForm";
import EmployeeDashboard from "@/employee/pages/EmployeeDashboard";
import CashierDashboard from "@/employee/pages/CashierDashboard";
import PublicServiceDashboard from "@/employee/pages/PublicServiceDashboard";
import TreasuryDashboard from "@/employee/pages/TreasuryDashboard";
import PaymentInvoice from "@/employee/pages/PaymentInvoice";
import DepartmentManagerDashboard from "@/employee/pages/DepartmentManagerDashboard";
import AssistantManagerDashboard from "@/employee/pages/AssistantManagerDashboard";
import EngineerDashboard from "@/employee/pages/EngineerDashboard";
import AssignmentFormPage from "@/employee/pages/AssignmentFormPage";
import SurveyorDashboard from "@/employee/pages/SurveyorDashboard";
import UnifiedFormPrint from "@/employee/pages/UnifiedFormPrint";
import ApplicationStatus from "@/citizen/pages/ApplicationStatus";
import ApplicationTracking from "@/citizen/pages/ApplicationTracking";
import PublicHomePage from "@/pages/PublicHomePage";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/auth/useAuth";
import SimpleLogin from "@/auth/SimpleLogin";

function AuthenticatedRouter() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return <SimpleLogin onLogin={login} />;
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/building-licenses" component={BuildingLicenses} />
        <Route path="/surveying-decision" component={SurveyingDecision} />
        <Route path="/technical-requirements" component={TechnicalRequirements} />
        <Route path="/legal-system" component={LegalSystem} />
        <Route path="/organizational-structure" component={OrganizationalStructure} />
        <Route path="/advanced-organizational-structure" component={AdvancedOrganizationalStructure} />
        <Route path="/advanced-analytics" component={AdvancedAnalytics} />
        <Route path="/user-management" component={UserManagement} />
        <Route path="/geographic-data" component={GeographicDataManager} />
        <Route path="/document-archive" component={DocumentArchive} />
        <Route path="/smart-search" component={SmartSearch} />
        <Route path="/task-management" component={TaskManagement} />
        <Route path="/service-builder" component={ServiceBuilder} />
        <Route path="/applications/track" component={ApplicationTrackingAdmin} />
        <Route path="/applications/pending" component={PendingApplications} />
        <Route path="/employee/dashboard" component={EmployeeDashboard} />
        <Route path="/employee/cashier" component={CashierDashboard} />
        <Route path="/employee/public-service" component={PublicServiceDashboard} />
        <Route path="/employee/treasury" component={TreasuryDashboard} />
        <Route path="/employee/manager" component={DepartmentManagerDashboard} />
        <Route path="/employee/invoice/:id" component={PaymentInvoice} />
        <Route path="/employee/unified-form/:id" component={UnifiedFormPrint} />
        <Route path="/employee/department-manager" component={DepartmentManagerDashboard} />
        <Route path="/employee/assistant-manager" component={AssistantManagerDashboard} />
        <Route path="/employee/assignment-form" component={AssignmentFormPage} />
        <Route path="/employee/engineer" component={EngineerDashboard} />
        <Route path="/employee/surveyor" component={SurveyorDashboard} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function MainRouter() {
  return (
    <Switch>
      {/* Public routes - accessible without authentication */}
      <Route path="/" component={PublicHomePage} />
      <Route path="/services/surveying-decision" component={SurveyingDecisionForm} />
      <Route path="/citizen/application-status" component={ApplicationStatus} />
      <Route path="/citizen/track" component={ApplicationTracking} />
      
      {/* Protected admin/employee routes */}
      <Route path="/login">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/admin/:rest*">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/employee/:rest*">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/building-licenses">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/surveying-decision">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/technical-requirements">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/legal-system">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/organizational-structure">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/advanced-organizational-structure">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/advanced-analytics">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/user-management">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/geographic-data">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/document-archive">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/smart-search">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/task-management">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/service-builder">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      <Route path="/applications/:rest*">
        <AuthProvider>
          <AuthenticatedRouter />
        </AuthProvider>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="yemen-platform-theme">
        <TooltipProvider>
          <Toaster />
          <MainRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
