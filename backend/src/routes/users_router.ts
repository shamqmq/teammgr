import express, { type Request, type Response } from "express"
import { deleteUser, getAllUsers, getUserByEmail, getUserById, updateUser } from "../utils/db_interface"
import { validate, updateUserSchema, isValidUUID } from "../middleware/validation";
import { adminOnly, authenticate } from "../middleware/auth";
import { hash } from "bcryptjs";

const router = express.Router();

//| Method | Path          | Access     | Description                |
//|--------|---------------|------------|----------------------------|
//| GET    | /users        | Admin      | List all users (paginated) |
//| GET    | /users/:id    | Admin/Self | Get user details           |
//| PATCH  | /users/:id    | Admin/Self | Update profile             |
//| DELETE | /users/:id    | Admin      | Delete user                |

// GET /api/users
// Supports optional search: /api/users?search=John
router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    // 1. Fetch all users from your database
    let allUsers = await getAllUsers(); // Replace with your actual DB call
    
    const searchQuery = req.query.search as string;

    // 2. If the frontend sent a search query, filter and sort
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      
      // Filter: The "Giant Net" (matches name or email)
      let filteredUsers = allUsers.filter(user => 
        (user.name && user.name.toLowerCase().includes(lowerQuery)) || 
        (user.email && user.email.toLowerCase().includes(lowerQuery))
      );

      // Sort: The "Smart Sorter"
      allUsers = filteredUsers.sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();

        // Priority 1: Exact Match
        if (aName === lowerQuery && bName !== lowerQuery) return -1;
        if (bName === lowerQuery && aName !== lowerQuery) return 1;

        // Priority 2: Starts With
        const aStarts = aName.startsWith(lowerQuery);
        const bStarts = bName.startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        // Priority 3: Alphabetical
        return aName.localeCompare(bName);
      });
    }

    // 3. Strip out passwords before sending to the frontend!
    const users = allUsers.map(({ password_hash, ...user }) => user);
    
    // 4. Send back the exactly structure the frontend expects
    return res.status(200).json({ users });
    
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/me
router.get("/me", authenticate, async (_req, res) => {
        const uid: string = res.locals.user.sub || "no id";
        if (!isValidUUID(uid)) {
                console.log(res.locals.user);
          res.status(400).json({ error: "Invalid user ID format"});
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

// PATCH /api/users/me
router.patch("/me", authenticate, validate(updateUserSchema), async (req, res) => {
  const uid = res.locals.user.sub;
  if (!isValidUUID(uid)) {
    return res.status(400).json({ error: "Invalid user ID format" });
  }

  try {
    const existingUser = await getUserById(uid);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const updates = req.body;

    if (updates.email && updates.email !== existingUser.email) {
      const conflict = await getUserByEmail(updates.email);
      if (conflict) {
        return res.status(409).json({ error: "Email already in use" });
      }
    }

    // ← FIXED: added await
    if (updates.password) {
      updates.password_hash = await hash(updates.password, 10);
      delete updates.password;
    }

    const updatedUser = await updateUser(uid, updates);
    const { password_hash, ...cleanUser } = updatedUser;
    return res.status(200).json({ success: true, user: cleanUser });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:id
router.get("/:id", authenticate, async (req, res) => {
        const uid = req.params.id;

        if (!isValidUUID(uid)) {
                res.status(400).json({ error: "Invalid user ID format" });
                return;
        }
        const user = res.locals.user;
        if (user.sub !== uid) {
                return res.status(401).json({ error: 'Authentication required' });
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
router.patch("/:id", authenticate, validate(updateUserSchema), async (req, res) => {
        const uid = req.params.id;

        // Check valid UUID
        if (!isValidUUID(uid)) {
                res.status(400).json({ error: "Invalid user ID format" });
                return;
        }

        if (res.locals.user.sub !== uid) {
                return res.status(401).json({ error: 'Authentication required' });
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



// DELETE /users/:id
router.delete("/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
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

                res.status(204).send();
        } catch (error) {
                console.error("Update user error:", error);
                res.status(500).json({ error: "Internal server error" });
        }
});


export default router;
