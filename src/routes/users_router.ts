import express, { type Request, type Response } from "express"
import { deleteUser, getAllUsers, getUserByEmail, getUserById, updateUser } from "../utils/db_interface"
import { validate, updateUserSchema, isValidUUID } from "../middleware/validation";
import { hash } from "bun";

const router = express.Router();

//| Method | Path          | Access     | Description                |
//|--------|---------------|------------|----------------------------|
//| GET    | /users        | Admin      | List all users (paginated) |
//| GET    | /users/:id    | Admin/Self | Get user details           |
//| PATCH  | /users/:id    | Admin/Self | Update profile             |
//| DELETE | /users/:id    | Admin      | Delete user                |

// TODO: Add auth before performing any of functions

// GET /api/users
router.get("/", async (_req, res) => {
        try {
                const allUsers = await getAllUsers();
                // Remove password_hash from each user
                const users = allUsers.map(({ password_hash, ...user }) => user);
                res.status(200).json({ users });
        } catch (error) {
                res.status(500).json({ error: "Internal server error" });
        }
});

// GET /api/users/:id
router.get("/:id", async (req, res) => {
        const uid = req.params.id;
        if (!uid) {
                res.status(400).json({ error: "Missing user ID" });
                return;
        }

        if (!isValidUUID(uid)) {
                res.status(400).json({ error: "Invalid user ID format" });
                return;
        }
        try {
                const user = await getUserById(uid);
                if (!user) {
                        res.status(404).json({ error: "User not found" });
                        return;
                }
                // Remove password_hash before sending
                const { password_hash, ...cleanUser } = user;
                res.status(200).json({ user: cleanUser });
        } catch (error) {
                console.error("getUserById error:", error);  // ← this will show the real problem
                res.status(500).json({ error: "Internal server error" });
        }
});

// PATCH /api/users/:id
router.patch("/:id", validate(updateUserSchema), async (req, res) => {
        const uid = req.params.id;

        // Check valid UUID
        if (!isValidUUID(uid)) {
                res.status(400).json({ error: "Invalid user ID format" });
                return;
        }

        try {
                // Does the user exist?
                const existingUser = await getUserById(uid);
                if (!existingUser) {
                        res.status(404).json({ error: "User not found" });
                        return;
                }

                const updates = req.body;   // already validated and parsed by middleware

                // If email is being changed, check uniqueness
                if (updates.email && updates.email !== existingUser.email) {
                        const conflict = await getUserByEmail(updates.email);
                        if (conflict) {
                                res.status(409).json({ error: "Email already in use" });
                                return;
                        }
                }

                // If password is provided, hash it
                if (updates.password) {
                        updates.password_hash = hash(updates.password, 10);
                        delete updates.password;               // don't save plaintext
                }

                // Perform update (only the fields present in `updates` will be changed)
                const updatedUser = await updateUser(uid, updates);

                // Strip password_hash from response
                const { password_hash, ...cleanUser } = updatedUser;
                res.status(200).json({ user: cleanUser });
        } catch (error) {
                console.error("Update user error:", error);
                res.status(500).json({ error: "Internal server error" });
        }
});

router.delete("/:id", async (req: Request, res: Response) => {
        const uid = req.params.id;

        // Check valid UUID
        if (!isValidUUID(uid)) {
                res.status(400).json({ error: "Invalid user ID format" });
                return;
        }

        try {
                // Does the user exist?
                const existingUser = await getUserById(uid);
                if (!existingUser) {
                        res.status(404).json({ error: "User not found" });
                        return;
                }
                await deleteUser(uid);

                res.status(204).json({ "message": "User deleted successfuly" });
        } catch (error) {
                console.error("Update user error:", error);
                res.status(500).json({ error: "Internal server error" });
        }
});


export default router;
