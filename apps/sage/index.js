import { app } from "./src/index.js";
import { environment } from "./src/loaders/environment.loader.js";
import { createServer } from "http";


(async function init() {
  const server = createServer(app);
  server.listen(environment.PORT, () => {
    console.log(`Server listening on port ${environment.PORT}`);
  });

})();
