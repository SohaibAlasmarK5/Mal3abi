import { writeFileSync } from "node:fs";
import { themeCss } from "../src/tokens/css.ts";

const target = new URL("../src/tokens/theme.css", import.meta.url);
writeFileSync(target, themeCss());
console.log("Wrote src/tokens/theme.css");
