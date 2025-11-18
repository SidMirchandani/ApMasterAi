
import fs from "fs";
import path from "path";

export interface APSubjectModule {
  subjectCode: string;
  getKeywords(): any;
  getSections(): any;
  transformCrackAP(html: string): any;
}

export function loadAllSubjects(): Record<string, APSubjectModule> {
  const baseDir = __dirname;
  const modules: Record<string, APSubjectModule> = {};

  for (const folder of fs.readdirSync(baseDir)) {
    const fullPath = path.join(baseDir, folder);

    if (fs.statSync(fullPath).isDirectory()) {
      const modPath = path.join(fullPath, "script.ts");
      if (fs.existsSync(modPath)) {
        const mod = require(modPath) as APSubjectModule;
        modules[mod.subjectCode] = mod;
      }
    }
  }

  return modules;
}
