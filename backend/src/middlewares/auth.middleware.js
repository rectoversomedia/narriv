import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers["authorization"];
    if (!bearerHeader) {
        return res.status(403).json({ error: "Access denied. No token provided." });
    }

    const token = bearerHeader.split(" ")[1];
    if (!token) {
         return res.status(403).json({ error: "Access denied. Token missing." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "narriv_secret_key");
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token." });
    }
};
