import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";

import Home from "../pages/Home";
import Welcome from "../pages/Welcome";
import Community from "../pages/Community";
import Directory from "../pages/Directory";
import Events from "../pages/Events";
import EventDetails from "../pages/EventDetails";
import About from "../pages/About";
import Contact from "../pages/Contact";
import HowItWorks from "../pages/HowItWorks";
import JoinUs from "../pages/JoinUs";
import CollectiveProfile from "../pages/CollectiveProfile";
import MessagingCenter from "../pages/MessagingCenter";
import Jobs from "../pages/Jobs";
import Classifieds from "../pages/Classifieds";
import LoginPage from "../pages/login";
import AdminPage from "../pages/admin";
import ManagerPortal from "../pages/ManagerPortal";
import ProtectedRoleRoute from "../components/auth/ProtectedRoleRoute";
import ProtectedUserRoute from "../components/auth/ProtectedUserRoute";
import AdminLogin from "../pages/AdminLogin";
import Dashboard from "../pages/Dashboard";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Header />

      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/event" element={<Events />} />
        <Route path="/event/:id" element={<EventDetails />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/join-us" element={<JoinUs />} />
        <Route path="/community" element={<Community />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/classifieds" element={<Classifieds />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Routes (Strictly Admin & Superadmin) */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route element={<ProtectedRoleRoute allowedRoles={["admin", "superadmin"]} strict={true} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* Manager Routes (Strictly Manager & Superadmin oversight) */}
        <Route element={<ProtectedRoleRoute allowedRoles={["manager", "superadmin"]} />}>
          <Route path="/manager" element={<ManagerPortal />} />
        </Route>

        {/* User Dashboard & Messaging (Protected) */}
        <Route element={<ProtectedUserRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/messages" element={<MessagingCenter />} />
        </Route>

        {/* Dynamic Collective Profile & Sub-Pages Route (Placed after static routes) */}
        <Route path="/:collectiveSlug" element={<CollectiveProfile />} />
        <Route path="/:collectiveSlug/:subPage" element={<CollectiveProfile />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
};

export default AppRoutes;
