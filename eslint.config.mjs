import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disabilita i warning per le dipendenze mancanti negli useEffect
      "react-hooks/exhaustive-deps": "off",
      // Altre opzioni:
      // "react-hooks/exhaustive-deps": "warn", // mantiene come warning
      // "react-hooks/exhaustive-deps": "error", // converte in errore
    },
  },
];

export default eslintConfig;
