// middleware to authenticate JWT tokens

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : header;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Not authorized" });
  }

  const user = await User.findById(decoded.id).select("_id role isBanned");
  if (!user) {
    return res.status(401).json({ message: "Not authorized" });
  }
  if (user.isBanned) {
    return res.status(403).json({ message: "Account is banned" });
  }
  req.user = { id: user._id, role: user.role };
  return next();
};

module.exports = authMiddleware;
