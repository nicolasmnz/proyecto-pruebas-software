import express from "express";
import projectRoutes from './routes/project.routes.js';

const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use('/api/projects', projectRoutes);

export default app;
