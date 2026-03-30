/**
 * Load ApMasterAi/.env.local for tsx CLI scripts (Next loads it automatically; tsx does not).
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(projectRoot, ".env.local") });
