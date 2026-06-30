export default function PortalTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="workspace-view">{children}</div>;
}
