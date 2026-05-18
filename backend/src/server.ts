import app from "./app";
import {PORT} from "./consts"
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
