import chalk from "chalk";
import { configureCognee } from "../config/wizard";
import { configureGithub } from "../config/githubWizard";
import { configureLocalJson } from "../config/localJsonWizard";


export async function authCommand(provider?: string): Promise<void> {

    if (provider === "github") {
        await configureGithub();
        return;
    }

    if (provider === "cognee") {
        await configureCognee();
        return;
    }

    if (provider === "local-json") {
        await configureLocalJson();
        return;
    }

    if (provider) {
        console.log(chalk.red(`Unknown provider: ${provider}`));
        return;
    }

    console.log(chalk.bold.cyan("\n  cliper auth\n"));

    await configureGithub();

    console.log("");

    await configureCognee();

    console.log(
        chalk.green("\n✓ Cliper is configured and ready.\n")
    );
}
