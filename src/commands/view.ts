// import chalk from "chalk";
// import { getAuthToken } from "./auth";
// import * as path from "path";
// import { pushCommand } from "./push";

// const DASHBOARD_URL = "https://cliperhq.vercel.app/dashboard";

// export async function viewCommand(): Promise<void> {
//     const token = getAuthToken();

//     if (!token) {
//         console.error(chalk.red("\n  Not authenticated. Run cliper auth first.\n"));
//         process.exit(1);
//     }

//     console.log(chalk.bold.cyan("\n  cliper view\n"));

//     // Push latest context first
//     await pushCommand();

//     const projectName = path.basename(process.cwd());
//     const { default: open } = await import("open");
//     const url = `${DASHBOARD_URL}?project=${encodeURIComponent(projectName)}`;

//     console.log(chalk.gray(`  Opening: ${url}\n`));
//     await open(url);
// }