import app from "./app.js";
import { env } from "./config/env.js";

const PORT = env.port;

// Sin host explícito, Node escucha en IPv6 (::) e IPv4 a la vez. Con
// "0.0.0.0" solo escuchaba IPv4 y en macOS "localhost" resuelve a ::1,
// lo que hacía fallar a clientes como Playwright con ECONNRESET.
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
