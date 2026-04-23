import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory user store for simulation-free full-stack structure
// In production, use a database like MongoDB or PostgreSQL
const users: any[] = [];
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      req.user = user;
      next();
    });
  };

  // --- API Routes ---

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, displayName } = req.body;
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Math.random().toString(36).substring(2, 11),
      email,
      password: hashedPassword,
      displayName: displayName || email.split('@')[0]
    };

    users.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    const token = jwt.sign(userWithoutPassword, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ user: userWithoutPassword, token });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = jwt.sign(userWithoutPassword, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user: userWithoutPassword, token });
  });

  app.patch("/api/auth/profile", authenticateToken, async (req: any, res) => {
    const { displayName, email } = req.body;
    const userIndex = users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    if (email && email !== users[userIndex].email && users.find(u => u.email === email)) {
      return res.status(400).json({ error: "Email already in use" });
    }

    users[userIndex] = {
      ...users[userIndex],
      displayName: displayName || users[userIndex].displayName,
      email: email || users[userIndex].email
    };

    const { password: _, ...userWithoutPassword } = users[userIndex];
    res.json({ user: userWithoutPassword });
  });

  // Protected Task Routes
  app.get("/api/tasks", authenticateToken, (req: any, res) => {
    // In a real app, query tasks where userId = req.user.id
    res.json({ message: `Tasks accessed for user ${req.user.email}` });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
