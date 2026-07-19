import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const textExtensions = new Set([".css", ".csv", ".html", ".js", ".json", ".md", ".mjs", ".sql", ".ts", ".tsx", ".txt", ".yml", ".yaml"]);
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => textExtensions.has(extname(file).toLowerCase()));

const patterns = [
  { name: "JWT-like secret", regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
  { name: "OpenAI-style API key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "committed Supabase service key", regex: /SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY\s*=\s*[^\s#][^\r\n]*/g },
  { name: "committed Naver secret", regex: /NAVER_SEARCHAD_SECRET_KEY\s*=\s*[^\s#][^\r\n]*/g },
  { name: "committed admin plaintext password", regex: /ERP_ADMIN_PASSWORD\s*=\s*[^\s#][^\r\n]*/g },
  { name: "hardcoded admin plaintext password", regex: /ERP_ADMIN_PASSWORD\s*[:=]\s*["'][^"']+["']/g }
];

const findings = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern.regex)];
    for (const match of matches) {
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      findings.push(`${file}:${line} ${pattern.name}`);
    }
  }
}

if (findings.length) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed (${files.length} text files).`);
}
