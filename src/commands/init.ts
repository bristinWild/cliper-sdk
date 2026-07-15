import { initProject, CliperInitOptions } from "../sdk/init";

export async function initCommand(
  options: CliperInitOptions,
): Promise<void> {
  return initProject(options);
}