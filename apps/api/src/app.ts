import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import projectRoutes from './routes/project.routes.js';
import workItemRoutes from './routes/workitem.routes.js';
import userRoutes from './routes/user.routes.js'
import authRoutes from './routes/auth.routes.js'

const app = express();

app.use(cors({
    origin: env.corsOrigin
}));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', workItemRoutes);
app.use("/api/users",userRoutes);

export default app;
