import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import DashboardPage from "./pages/Dashboard";
import GoalPage from "./pages/Goal";
import GoalsPage from "./pages/Goals";
import OpportunitiesPage from "./pages/Opportunities";
import ApplicationsPage from "./pages/Applications";
import DocumentsPage from "./pages/Documents";
import ChatPage from "./pages/Chat";
import ProfilePage from "./pages/Profile";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import OnboardingPage from "./pages/Onboarding";

export default function App() {
  return (
    <Routes>
      {/* Public auth pages — logged-in users bounce to the workspace */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />

      {/* Authenticated app */}
      <Route element={<ProtectedRoute />}>
        {/* Focused setup flow — outside the app shell */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/goals/:goalId" element={<GoalPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/assistant" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
