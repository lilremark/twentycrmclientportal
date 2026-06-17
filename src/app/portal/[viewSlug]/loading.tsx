export default function PortalViewLoading() {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Loading portal</p>
          <h2 className="text-2xl font-bold">Opening records...</h2>
          <p>Preparing the table and filters.</p>
        </div>
      </div>
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
