import express from "express";
import cors from "cors";
import projectRoutes from './routes/project.routes.js';
import userRoutes from './routes/user.routes.js'
import authRoutes from './routes/auth.routes.js'

const app = express();

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use('/api/projects', projectRoutes);
app.use("/api/users",userRoutes);

export default app;
