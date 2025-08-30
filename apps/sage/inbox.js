import { app } from "./src/index.js";
import { environment } from "./src/loaders/environment.loader.js";

const port = environment.PORT || 8080;

app.listen(port, () => {
  console.log(`sage listening on http://localhost:${port}`);
});
