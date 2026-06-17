import { buildApp } from "./app.js";
import { config } from "./config.js";

/** Process entrypoint: build the app and bind the configured port. */
async function main(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ host: config.HOST, port: config.PORT });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
