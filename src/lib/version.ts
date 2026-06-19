import packageJson from "../../package.json";

export const DOCKER_HUB_REPOSITORY = "lilremark/twentycrmclientportal";

export function getCurrentVersion() {
  return process.env.APP_VERSION?.trim() || packageJson.version;
}

export function compareVersions(left: string, right: string) {
  const parse = (value: string) => {
    const match = value.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
    return match
      ? [Number(match[1]), Number(match[2]), Number(match[3])]
      : null;
  };
  const leftParts = parse(left);
  const rightParts = parse(right);
  if (!leftParts || !rightParts) return 0;

  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index] - rightParts[index];
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function latestVersionTag(tags: string[]) {
  return tags
    .filter((tag) => /^v?\d+\.\d+\.\d+$/.test(tag))
    .sort((left, right) => compareVersions(right, left))[0] ?? null;
}
