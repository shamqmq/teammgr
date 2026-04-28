import express, {type Request, type Response} from "express";
import auth_router from "./routes/auth_router";
import users_router from "./routes/users_router";

const app = express();

app.use(express.json());

app.use("/api/auth", auth_router);
app.use("/api/users", users_router);

app.get("/api",(_req: Request, res: Response) =>{
  res.status(200).json({msg: "you reached the root"});
});

export default app;
