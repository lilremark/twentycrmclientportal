import { ViewTransition } from "react";

export default function AdminTemplate({
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
