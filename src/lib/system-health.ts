import "server-only";

import { postgresClient } from "@/lib/db";
import {
  compareVersions,
  DOCKER_HUB_REPOSITORY,
  getCurrentVersion,
  latestVersionTag,
} from "@/lib/version";

type DockerHubTag = {
  name?: string;
  last_updated?: string;
};

type DockerHubTagsResponse = {
  results?: DockerHubTag[];
};

export type HealthCheck = {
  status: "operational" | "degraded" | "unavailable";
  detail: string;
  latencyMs?: number;
};

async function checkDatabase(): Promise<HealthCheck> {
  const startedAt = performance.now();
  try {
    await postgresClient`select 1`;
    return {
      status: "operational",
      detail: "PostgreSQL accepted a live query.",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      status: "unavailable",
      detail:
        error instanceof Error
          ? error.message
          : "PostgreSQL did not accept a live query.",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

async function checkDockerHub(currentVersion: string) {
  const startedAt = performance.now();
  try {
    const response = await fetch(
      `https://hub.docker.com/v2/repositories/${DOCKER_HUB_REPOSITORY}/tags?page_size=100`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) {
      throw new Error(`Docker Hub returned HTTP ${response.status}.`);
    }
    const payload = (await response.json()) as DockerHubTagsResponse;
    const tags = payload.results ?? [];
    const latestVersion = latestVersionTag(
      tags.flatMap((tag) => (tag.name ? [tag.name] : [])),
    );
    const latestTag = tags.find((tag) => tag.name === latestVersion);

    return {
      check: {
        status: "operational",
        detail: latestVersion
          ? `Latest published version is ${latestVersion}.`
          : "Docker Hub responded, but no semantic version tag was found.",
        latencyMs: Math.round(performance.now() - startedAt),
      } satisfies HealthCheck,
      latestVersion,
      latestPublishedAt: latestTag?.last_updated ?? null,
      updateAvailable: latestVersion
        ? compareVersions(currentVersion, latestVersion) < 0
        : false,
    };
  } catch (error) {
    return {
      check: {
        status: "degraded",
        detail:
          error instanceof Error
            ? error.message
            : "Docker Hub version information is unavailable.",
        latencyMs: Math.round(performance.now() - startedAt),
      } satisfies HealthCheck,
      latestVersion: null,
      latestPublishedAt: null,
      updateAvailable: false,
    };
  }
}

export async function getSystemHealth() {
  const currentVersion = getCurrentVersion();
  const [database, dockerHub] = await Promise.all([
    checkDatabase(),
    checkDockerHub(currentVersion),
  ]);

  return {
    checkedAt: new Date(),
    portal: {
      status: "operational",
      detail: "The portal process is running and serving this admin session.",
    } satisfies HealthCheck,
    database,
    dockerHub: dockerHub.check,
    currentVersion,
    latestVersion: dockerHub.latestVersion,
    latestPublishedAt: dockerHub.latestPublishedAt,
    updateAvailable: dockerHub.updateAvailable,
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
  };
}
