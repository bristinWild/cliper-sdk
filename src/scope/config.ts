import * as fs from "fs";
import * as path from "path";

export interface ScopeConfig {
  active: string[];
  watched: string[];
  updatedAt: string;
}

const DEFAULT_CONFIG: ScopeConfig = {
  active: [],
  watched: [],
  updatedAt: new Date().toISOString(),
};

export function getCliperDir(projectRoot: string): string {
  return path.join(projectRoot, ".cliper");
}

export function getScopeConfigPath(projectRoot: string): string {
  return path.join(getCliperDir(projectRoot), "scope.json");
}

export function loadScopeConfig(projectRoot: string): ScopeConfig {
  const configPath = getScopeConfigPath(projectRoot);
  if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveScopeConfig(projectRoot: string, config: ScopeConfig): void {
  const dir = getCliperDir(projectRoot);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync(getScopeConfigPath(projectRoot), JSON.stringify(config, null, 2));
}
