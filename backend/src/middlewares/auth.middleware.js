import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ error: "JWT secret is not configured." });
    }

    const bearerHeader = req.headers["authorization"];
    if (!bearerHeader) {
        return res.status(401).json({ error: "Access token required." });
    }

    const token = bearerHeader.split(" ")[1];
    if (!token) {
         return res.status(401).json({ error: "Access token missing." });
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Access token expired." });
        }
        return res.status(401).json({ error: "Invalid access token." });
    }
};
