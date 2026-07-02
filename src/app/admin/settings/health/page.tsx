import {
  Box,
  Cloud,
  Database,
  ExternalLink,
  Server,
} from "lucide-react";

import { HealthRefreshButton } from "@/components/health-refresh-button";
import {
  getSystemHealth,
  type HealthCheck,
} from "@/lib/system-health";
import { DOCKER_HUB_REPOSITORY } from "@/lib/version";

export default async function SettingsHealthPage() {
  const health = await getSystemHealth();

  return (
    <div className="page-stack health-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">System status</p>
          <h2>Deployment health</h2>
          <p>
            Live checks for the portal process, database dependency, and
            published Docker image.
          </p>
        </div>
        <HealthRefreshButton />
      </div>

      <section className="health-grid">
        <HealthCard
          check={health.portal}
          icon={<Server size={19} />}
          label="Portal container"
          meta={`Uptime ${formatUptime(health.uptimeSeconds)}`}
        />
        <HealthCard
          check={health.database}
          icon={<Database size={19} />}
          label="PostgreSQL dependency"
          meta={formatLatency(health.database.latencyMs)}
        />
        <HealthCard
          check={health.dockerHub}
          icon={<Cloud size={19} />}
          label="Docker Hub"
          meta={formatLatency(health.dockerHub.latencyMs)}
        />
      </section>

      <section className="card settings-card health-version-card">
        <div className="settings-card-heading">
          <span className="settings-section-icon">
            <Box size={19} />
          </span>
          <div>
            <h2>Software version</h2>
            <p>
              Compare the running container with semantic version tags
              published to Docker Hub.
            </p>
          </div>
        </div>
        <div className="health-version-grid">
          <VersionValue label="Running version" value={health.currentVersion} />
          <VersionValue
            label="Latest Docker Hub version"
            value={health.latestVersion ?? "Unavailable"}
          />
          <VersionValue
            label="Release status"
            tone={health.updateAvailable ? "warning" : "success"}
            value={
              health.latestVersion
                ? health.updateAvailable
                  ? "Update available"
                  : "Up to date"
                : "Could not compare"
            }
          />
          <VersionValue label="Node.js runtime" value={health.nodeVersion} />
        </div>
        <div className="health-version-footer">
          <span>
            {health.latestPublishedAt
              ? `Latest version published ${new Date(health.latestPublishedAt).toLocaleString()}.`
              : "Docker Hub publication time is unavailable."}
          </span>
          <a
            className="health-external-link"
            href={`https://hub.docker.com/r/${DOCKER_HUB_REPOSITORY}/tags`}
            rel="noreferrer"
            target="_blank"
          >
            View image tags
            <ExternalLink size={14} />
          </a>
        </div>
      </section>
    </div>
  );
}

function HealthCard({
  check,
  icon,
  label,
  meta,
}: {
  check: HealthCheck;
  icon: React.ReactNode;
  label: string;
  meta: string;
}) {
  return (
    <article className="card health-card">
      <div className="health-card-top">
        <span className="settings-section-icon">{icon}</span>
        <span className={`health-status health-status-${check.status}`}>
          <span />
          {statusLabel(check.status)}
        </span>
      </div>
      <div>
        <h3>{label}</h3>
        <p>{check.detail}</p>
      </div>
      <span className="health-card-meta">{meta}</span>
    </article>
  );
}

function VersionValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div className="health-version-value">
      <span>{label}</span>
      <strong className={tone ? `health-tone-${tone}` : undefined}>
        {value}
      </strong>
    </div>
  );
}

function statusLabel(status: HealthCheck["status"]) {
  if (status === "operational") return "Operational";
  if (status === "degraded") return "Degraded";
  return "Unavailable";
}

function formatLatency(latencyMs?: number) {
  return latencyMs === undefined ? "No timing available" : `${latencyMs} ms`;
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
