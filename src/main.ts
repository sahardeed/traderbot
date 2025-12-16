import "dotenv/config";
import { Bot } from "./system/bot.js";

async function main() {
  const bot = new Bot(7000);   // 7 seconds per loop
  await bot.run();
}

main();
