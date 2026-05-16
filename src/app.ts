import express, {type Request, type Response} from "express";
import auth_router from "./routes/auth_router";
import users_router from "./routes/users_router";
import tasks_router from "./routes/tasks_router";
import cookieParser from 'cookie-parser';
import { testDB } from './utils/db_interface';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", auth_router);
app.use("/api/users", users_router);
app.use("/api/tasks", tasks_router);

app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    // Quick database ping
    const _rec = await testDB();   

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database unreachable',
    });
  }
});

app.get("/api",(_req: Request, res: Response) =>{
  res.redirect('/api/health');
});

export default app;
