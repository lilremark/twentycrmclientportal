import type { PortalNote } from "@/lib/portal-notes";

export function PortalNotes({
  notes,
  canEdit,
  createAction,
  updateAction,
}: {
  notes: PortalNote[];
  canEdit: boolean;
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (noteId: string, formData: FormData) => void | Promise<void>;
}) {
  return (
    <section className="record-notes-section">
      <div className="record-notes-heading">
        <div>
          <p className="eyebrow">Notes</p>
          <h3>Record notes</h3>
        </div>
      </div>
      {notes.length ? (
        <div className="record-note-list">
          {notes.map((note) => (
            <article className="record-note-card" key={note.id}>
              {canEdit ? (
                <form action={updateAction.bind(null, note.id)}>
                  <label>
                    <span>Title</span>
                    <input
                      className="input"
                      defaultValue={note.title}
                      name="title"
                      required
                    />
                  </label>
                  <label>
                    <span>Body</span>
                    <textarea
                      className="input"
                      defaultValue={note.body}
                      name="body"
                      rows={4}
                    />
                  </label>
                  <button className="button secondary" type="submit">
                    Save note
                  </button>
                </form>
              ) : (
                <>
                  <h4>{note.title}</h4>
                  <p>{note.body || "No note body."}</p>
                </>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="record-notes-empty">No notes have been added yet.</p>
      )}
      {canEdit ? (
        <form action={createAction} className="record-note-create-form">
          <h4>Add note</h4>
          <label>
            <span>Title</span>
            <input className="input" name="title" required />
          </label>
          <label>
            <span>Body</span>
            <textarea className="input" name="body" rows={4} />
          </label>
          <button className="button" type="submit">
            Add note
          </button>
        </form>
      ) : null}
    </section>
  );
}
