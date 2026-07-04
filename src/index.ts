#!/usr/bin/env node

import * as dotenv from "dotenv";
dotenv.config();

import { program } from "commander";
import { Cliper } from "./sdk/cliper";
import { syncCommand } from "./commands/sync";
import { scopeCommand } from "./commands/scope";
import { statusCommand } from "./commands/status";
import { exportCommand } from "./commands/export";
import { analyzeCommand } from "./commands/analyze";
import { authCommand } from "./commands/auth";
import { agentCommand } from "./commands/agent";


const { version } = require("../package.json");
const sdk = new Cliper();

program
  .name("cliper")
  .description("AI context doc generator for developers")
  .version(version);

program
  .command("init")
  .description("Scan project and generate context document")
  .option("-p, --path <path>", "Project root path", process.cwd())
  .option("--max-file-size <kb>", "Max file size to include in KB", (v) => parseInt(v), 50)
  .action((options) => sdk.init(options));

program
  .command("sync")
  .description("Refresh stale sections of the context document")
  .option("--watch", "Auto-refresh on git events")
  .action(syncCommand);

program
  .command("scope")
  .description("Manage active scope")
  .argument("<action>", "add | remove | watch | list")
  .argument("[path]", "File or directory path")
  .action(scopeCommand);

program
  .command("status")
  .description("Show what is fresh, stale, and in scope")
  .action(statusCommand);

program
  .command("export")
  .description("Print context doc to stdout")
  .option("--format <format>", "Output format: md or txt", "md")
  .action(exportCommand);

program
  .command("analyze")
  .description("Analyze context doc and generate optimized AI prompt")
  .requiredOption("--model <model>", "Target model: claude or chatgpt")
  .action(analyzeCommand);

program
  .command("auth [provider]")
  .description("Authenticate with Cliper or external providers")
  .action(async (provider?: string) => {
    await authCommand(provider);
  });

// program
//   .command("push")
//   .description("Push context doc to Cliper dashboard")
//   .action(pushCommand);

// program
//   .command("view")
//   .description("Open project dashboard in browser")
//   .action(viewCommand);

program
  .command("agent")
  .description("Connect local AI coding agents to Cliper cloud")
  .argument("<action>", "connect")
  .action(agentCommand);

program.parse(process.argv);