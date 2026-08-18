import jwt from "jsonwebtoken";

export const requireTempToken = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Missing temp token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.tempAuth = decoded; // { channel, identifier }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid/Expired temp token" });
  }
};