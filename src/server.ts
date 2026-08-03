import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log("Backend ejecutándose en:");
  console.log(`http://localhost:${env.PORT}`);
  console.log(`Entorno: ${env.NODE_ENV}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ El puerto ${env.PORT} ya está en uso. Cierra el proceso que lo ocupa o cambia PORT en .env.`);
  } else {
    console.error("❌ Error al iniciar el servidor:", error);
  }
  process.exit(1);
});
