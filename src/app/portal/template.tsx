import { ViewTransition } from "react";

export default function PortalTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransition enter="workspace-enter" exit="workspace-exit">
      <div className="workspace-view">{children}</div>
    </ViewTransition>
  );
}
