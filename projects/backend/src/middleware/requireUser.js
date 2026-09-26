import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Accepts EITHER:
//  - our own custom JWT (email/phone/whatsapp OTP or password login)
//  - a Supabase session access_token (Google/Apple OAuth login)
// and resolves both down to the same users_active row, on req.activeUser.
export const requireUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing auth token" });
    }

    // Try our own JWT first (cheap, local, no network call).
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const targetId = decoded.userId || decoded.id;
      if (targetId) {
        const { data: user, error } = await supabase
          .from("users_active")
          .select("*")
          .eq("id", targetId)
          .maybeSingle();

        if (!error && user) {
          req.activeUser = user;
          return next();
        } else if (decoded.role) {
          req.activeUser = {
            id: targetId,
            role: decoded.role,
            email: decoded.email,
            phone: decoded.phone,
            name: decoded.name || decoded.username,
          };
          return next();
        }
      }
    } catch {
      // Not our JWT (or expired/invalid) — fall through to Supabase check.
    }

    // Fall back: treat it as a Supabase session access_token (OAuth login).
    const { data: supaUser, error: supaErr } = await supabase.auth.getUser(token);
    if (supaErr || !supaUser?.user) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    const { data: user, error } = await supabase
      .from("users_active")
      .select("*")
      .eq("auth_id", supaUser.user.id)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ message: "Account not found or not yet approved" });
    }

    req.activeUser = user;
    return next();
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// Optional user middleware: populates req.activeUser if token is present, but never blocks requests
export const optionalUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      req.activeUser = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const targetId = decoded.userId || decoded.id;
      if (targetId) {
        const { data: user, error } = await supabase
          .from("users_active")
          .select("*")
          .eq("id", targetId)
          .maybeSingle();

        if (!error && user) {
          req.activeUser = user;
          return next();
        } else if (decoded.role) {
          req.activeUser = {
            id: targetId,
            role: decoded.role,
            email: decoded.email,
            phone: decoded.phone,
            name: decoded.name || decoded.username,
          };
          return next();
        }
      }
    } catch {
      // Ignore
    }

    const { data: supaUser, error: supaErr } = await supabase.auth.getUser(token);
    if (!supaErr && supaUser?.user) {
      const { data: user } = await supabase
        .from("users_active")
        .select("*")
        .eq("auth_id", supaUser.user.id)
        .maybeSingle();

      if (user) {
        req.activeUser = user;
        return next();
      }
    }

    req.activeUser = null;
    return next();
  } catch {
    req.activeUser = null;
    return next();
  }
};

