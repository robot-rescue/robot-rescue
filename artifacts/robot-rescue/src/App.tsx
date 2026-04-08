import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

import { AppLayout } from "@/components/layout/app-layout";
import { SimulatedAlertsProvider, useSimulatedAlerts } from "@/components/simulated-alerts-provider";
import { MessagesProvider } from "@/components/messages-provider";
import Dashboard from "@/pages/dashboard";
import IncidentDetail from "@/pages/incident-detail";
import IncidentLog from "@/pages/incident-log";
import Analytics from "@/pages/analytics";
import Assignments from "@/pages/assignments";
import Messages from "@/pages/messages";
import NotFound from "@/pages/not-found";
import { useToast } from "@/hooks/use-toast";

const queryClient = new QueryClient();

// Drains the toast queue and fires toasts via the shadcn useToast hook
function ToastBridge() {
  const { toastQueue, consumeToasts } = useSimulatedAlerts();
  const { toast } = useToast();

  useEffect(() => {
    if (toastQueue.length === 0) return;
    const items = consumeToasts();
    items.forEach(item => {
      toast({ title: item.title, description: item.description, variant: item.variant });
    });
  }, [toastQueue, consumeToasts, toast]);

  return null;
}

function Router() {
  return (
    <AppLayout>
      <ToastBridge />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/incidents/:id" component={IncidentDetail} />
        <Route path="/assignments" component={Assignments} />
        <Route path="/log" component={IncidentLog} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/messages" component={Messages} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SimulatedAlertsProvider>
          <MessagesProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </MessagesProvider>
        </SimulatedAlertsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
