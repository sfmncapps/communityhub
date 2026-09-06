const ROLE_HIERARCHY = {
  superadmin: 4,
  admin: 3,
  manager: 2,
  user: 1,
};

export const requireRole = (allowedRoles = [], { strict = false } = {}) => {
  return (req, res, next) => {
    if (!req.activeUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRole = (req.activeUser.role || "user").toLowerCase();

    // If allowedRoles is empty or contains user's exact role, grant access
    if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
      return next();
    }

    // In strict mode, only exact roles in allowedRoles pass
    if (strict) {
      return res.status(403).json({
        message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. Your role: '${userRole}'`,
      });
    }

    // Check hierarchy: if user has a higher or equal role level than the lowest allowed role in list
    const userRank = ROLE_HIERARCHY[userRole] || 1;
    const requiredRanks = allowedRoles.map((r) => ROLE_HIERARCHY[r] || 1);
    const minRequiredRank = Math.min(...requiredRanks);

    if (userRank >= minRequiredRank) {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. Your role: '${userRole}'`,
    });
  };
};

export const requireExactRole = (allowedRoles = []) => {
  return requireRole(allowedRoles, { strict: true });
};
