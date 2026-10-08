import app from "./app.js";
import { env } from "./config/env.js";

const PORT = env.port;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`API running on http://${HOST}:${PORT}`);
});
