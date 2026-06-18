export default function PortalViewLoading() {
  return (
    <div className="page-stack">
      <section className="card table-shell portal-loading-shell">
        <div className="record-panel-loading" role="status" aria-label="Loading records">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="record-panel-loading-row" key={index}>
              <span />
              <span />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
