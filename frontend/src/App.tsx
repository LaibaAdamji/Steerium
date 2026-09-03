import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/Dashboard";
import GoalPage from "./pages/Goal";
import OpportunitiesPage from "./pages/Opportunities";
import ApplicationsPage from "./pages/Applications";
import DocumentsPage from "./pages/Documents";
import ChatPage from "./pages/Chat";
import ProfilePage from "./pages/Profile";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/goals/:goalId" element={<GoalPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/assistant" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
