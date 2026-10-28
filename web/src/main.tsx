import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { AGE_KEY, AgeGate } from "./components/AgeGate";
import { Layout } from "./components/Layout";
import { Empty, Spinner } from "./components/ui";
import { AuthProvider } from "./lib/auth";
import { PrefsProvider, store } from "./lib/prefs";
import { AGE_GATE_BYPASS } from "./lib/site";
import { ToastProvider } from "./lib/toast";
import Discover from "./pages/Discover";
import "./index.css";

const Venue = lazy(() => import("./pages/Venue"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const Suggest = lazy(() => import("./pages/Suggest"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Legal = lazy(() => import("./pages/Legal"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const Admin = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function App() {
  const { pathname } = useLocation();
  const [ageOk, setAgeOk] = useState(store.get(AGE_KEY) === "1");
  // Legal pages and account deletion skip the gate: store reviewers open them directly.
  if (!ageOk && !AGE_GATE_BYPASS.includes(pathname)) return <AgeGate onPass={() => setAgeOk(true)} />;

  return (
    <Suspense fallback={<Spinner />}>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Discover />} />
          <Route path="venue/:id" element={<Venue />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="suggest" element={<Suggest />} />
          <Route path="profile" element={<Profile />} />
          <Route path="login" element={<Login />} />
          <Route path="admin" element={<Admin />} />
          <Route path="privacy" element={<Legal doc="privacy" />} />
          <Route path="terms" element={<Legal doc="terms" />} />
          <Route path="community-rules" element={<Legal doc="community-rules" />} />
          <Route path="support" element={<Legal doc="support" />} />
          <Route path="delete-account" element={<DeleteAccount />} />
          <Route path="*" element={<Empty>Page not found.</Empty>} />
        </Route>
      </Routes>
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PrefsProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </PrefsProvider>
    </QueryClientProvider>
  </StrictMode>
);
