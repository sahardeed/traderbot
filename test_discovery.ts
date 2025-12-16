import { getActiveBaseTokens } from "./src/data/base_scanner.js";

(async () => {
  const tokens = await getActiveBaseTokens(50);
  console.log(tokens);
})();
