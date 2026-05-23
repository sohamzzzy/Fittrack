import { assertApiServerEnv } from "./load-env.js";

assertApiServerEnv();

const { default: app } = await import("./app.js");
const { logger } = await import("./lib/logger.js");

const port = Number(process.env.PORT || 3000);

app.listen(port, "0.0.0.0", (err?: unknown) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});