import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import supabase from "../../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const ROLE_RANK = {
  superadmin: 4,
  admin: 3,
  manager: 2,
  user: 1,
};

const getAuthToken = async () => {
  const localToken = localStorage.getItem("token");
  if (localToken) return localToken;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
};

export default function ProtectedRoleRoute({ allowedRoles = [], strict = false }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const rolesKey = Array.isArray(allowedRoles) ? allowedRoles.join(",") : "";

  useEffect(() => {
    let mounted = true;

    const checkRoleAccess = async () => {
      // 1. Mandatory token check - NEVER authorize on cached user string alone
      const token = await getAuthToken();
      if (!token) {
        if (mounted) {
          setAuthorized(false);
          setLoading(false);
        }
        return;
      }

      // 2. Validate token and fetch up-to-date role from backend
      try {
        const res = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            try {
              localStorage.setItem("user", JSON.stringify(data.user));
            } catch {}
            const role = (data.user.role || "user").toLowerCase();
            const allowed = isRoleAllowed(role, allowedRoles, strict);
            if (mounted) {
              setAuthorized(allowed);
              setLoading(false);
            }
            return;
          }
        }
      } catch (err) {
        console.error("Role check API error:", err);
      }

      // 3. Fallback check from verified session cache if offline/error
      const storedUserStr = localStorage.getItem("user");
      if (storedUserStr) {
        try {
          const parsedUser = JSON.parse(storedUserStr);
          const uRole = (parsedUser?.role || "user").toLowerCase();
          if (isRoleAllowed(uRole, allowedRoles, strict)) {
            if (mounted) {
              setAuthorized(true);
              setLoading(false);
            }
            return;
          }
        } catch {}
      }

      if (mounted) {
        setAuthorized(false);
        setLoading(false);
      }
    };

    checkRoleAccess();

    return () => {
      mounted = false;
    };
  }, [rolesKey, strict]);

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", fontStyle: "italic", color: "#64748b" }}>
        Verifying administrative access permissions...
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/admin-login" replace />;
  }

  return <Outlet />;
}

function isRoleAllowed(userRole, allowedRoles, strict = false) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (allowedRoles.includes(userRole)) return true;
  if (strict) return false;

  const userRank = ROLE_RANK[userRole] || 1;
  const minRequiredRank = Math.min(...allowedRoles.map((r) => ROLE_RANK[r] || 1));
  return userRank >= minRequiredRank;
}
