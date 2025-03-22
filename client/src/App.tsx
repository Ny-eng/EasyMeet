import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { Header } from "./components/Header";
import NotFound from "./pages/not-found";
import Home from "./pages/home";
import CreateEvent from "./pages/create-event";
import Event from "./pages/event";
import PrivacyPolicy from "./pages/privacy-policy";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/create">
          {() => (
            <>
              <Header minimal />
              <main className="pt-6">
                <CreateEvent />
              </main>
            </>
          )}
        </Route>
        <Route path="/event/:slug">
          {() => (
            <>
              <Header minimal />
              <main className="pt-6">
                <Event />
              </main>
            </>
          )}
        </Route>
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;