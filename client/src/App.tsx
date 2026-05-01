import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Article from "./pages/Article";
import Category from "./pages/Category";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Disclosures from "./pages/Disclosures";
import Privacy from "./pages/Privacy";
import Author from "./pages/Author";
import Toolkit from "./pages/Toolkit";
import Library from "./pages/Library";
import Assessments from "./pages/Assessments";
import Remedies from "./pages/Remedies";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/articles/:slug" component={Article} />
        <Route path="/category/:slug" component={Category} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/disclosures" component={Disclosures} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/author/the-oracle-lover" component={Author} />
        <Route path="/toolkit" component={Toolkit} />
        <Route path="/library" component={Library} />
        <Route path="/assessments" component={Assessments} />
        <Route path="/remedies" component={Remedies} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors closeButton />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
