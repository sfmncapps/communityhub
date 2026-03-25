import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedUserRoute() {
  const token = localStorage.getItem("token"); // same key you store in authService
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}