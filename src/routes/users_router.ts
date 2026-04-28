import express, {type Request, type Response} from "express"

const users_router = express.Router();

//| Method | Path          | Access     | Description                |
//|--------|---------------|------------|----------------------------|
//| GET    | /users        | Admin      | List all users (paginated) |
//| GET    | /users/:id    | Admin/Self | Get user details           |
//| PATCH  | /users/:id    | Admin/Self | Update profile             |
//| DELETE | /users/:id    | Admin      | Delete user                |


users_router.get("/users", (req: Request, res: Response)=> {
  var ureq = req.body;
  res.status(200).json({users : ureq, msg : "implement get users"});
});

users_router.get("/users/:id", (req: Request, res: Response)=> {
  var ureq = req.body;
  var uid = req.params.id; 
  res.status(200).json({request : ureq, userID: uid, msg : "implement get user by id"});
});

users_router.patch("/users/:id", (req: Request, res: Response)=> {
  var ureq = req.body;
  var uid = req.params.id; 
  res.status(200).json({request : ureq, userID: uid, msg : "implement update user profile"});
});

users_router.delete("/users/:id", (req: Request, res: Response)=> {
  var ureq = req.body;
  var uid = req.params.id; 
  res.status(200).json({request : ureq, userID: uid, msg : "implement delete user profile"});
});


export default users_router;
