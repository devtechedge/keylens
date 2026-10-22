/** True when argv contains `--name` (or `--name=value`). */
export function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`) || argv.some((a) => a.startsWith(`--${name}=`));
}
