"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Maximize2, NotebookPen, Plus, X } from "lucide-react";

import type { PortalNote } from "@/lib/portal-notes";

type NoteMode = "view" | "edit" | "create";

export function PortalNotes({
  notes,
  canEdit,
  createAction,
  updateAction,
  recordTitle,
}: {
  notes: PortalNote[];
  canEdit: boolean;
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (noteId: string, formData: FormData) => void | Promise<void>;
  recordTitle?: string;
}) {
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [mode, setMode] = useState<NoteMode>("view");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const editingNote = notes.find((note) => note.id === editingNoteId) ?? null;
  const modalNote = notes.find((note) => note.id === openNoteId) ?? null;
  const relationLabel = recordTitle?.trim() || "Current record";

  return (
    <section className="record-notes-section">
      <div className="record-notes-heading">
        <h3>
          All <span>{notes.length}</span>
        </h3>
        {canEdit ? (
          <button
            className="button secondary compact-button"
            onClick={() => {
              setEditingNoteId(null);
              setMode("create");
            }}
            type="button"
          >
            <Plus size={14} />
            Add note
          </button>
        ) : null}
      </div>

      <div className="record-notes-canvas" role="list">
        {mode === "create" && canEdit ? (
          <NoteForm
            action={createAction}
            onCancel={() => setMode("view")}
            submitLabel="Add note"
            title="New note"
          />
        ) : null}
        {editingNote && mode === "edit" && canEdit ? (
          <NoteForm
            action={updateAction.bind(null, editingNote.id)}
            body={editingNote.body}
            onCancel={() => {
              setEditingNoteId(null);
              setMode("view");
            }}
            submitLabel="Save note"
            title={editingNote.title}
          />
        ) : null}
        {notes.map((note) => (
          <article className="record-note-canvas-card" key={note.id} role="listitem">
            <div className="record-note-canvas-header">
              <h4>{note.title}</h4>
              <div className="record-note-view-actions">
                <button
                  className="button secondary compact-button"
                  onClick={() => setOpenNoteId(note.id)}
                  type="button"
                >
                  <Maximize2 size={13} />
                  View full note
                </button>
                {canEdit ? (
                  <button
                    className="button secondary compact-button"
                    onClick={() => {
                      setEditingNoteId(note.id);
                      setMode("edit");
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </div>
            <p>{note.body || "No note body."}</p>
            <div className="record-note-relations">
              <span>
                <NotebookPen size={14} />
                Relations
              </span>
              <strong title={relationLabel}>{relationLabel}</strong>
            </div>
          </article>
        ))}
        {!notes.length ? (
          canEdit ? (
            <button
              className="record-note-empty-action"
              onClick={() => setMode("create")}
              type="button"
            >
              <Plus size={16} />
              Add the first note
            </button>
          ) : (
            <div className="record-notes-empty">
              <FileText size={18} />
              <strong>No notes yet</strong>
              <p>Notes shared with this record will appear here.</p>
            </div>
          )
        ) : null}
      </div>
      {modalNote ? (
        <NoteDetailModal
          note={modalNote}
          onClose={() => setOpenNoteId(null)}
          updateAction={
            canEdit ? updateAction.bind(null, modalNote.id) : undefined
          }
        />
      ) : null}
    </section>
  );
}

function NoteDetailModal({
  note,
  onClose,
  updateAction,
}: {
  note: PortalNote;
  onClose: () => void;
  updateAction?: (formData: FormData) => void | Promise<void>;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="note-modal-layer">
      <button
        aria-label="Close note"
        className="note-modal-backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="note-modal-title"
        aria-modal="true"
        className="note-modal-card"
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="note-modal-heading">
          <div>
            <p className="eyebrow">Record note</p>
            <h2 id="note-modal-title">{note.title}</h2>
          </div>
          <button
            aria-label="Close note"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        {editing && updateAction ? (
          <form
            action={async (formData) => {
              await updateAction(formData);
              onClose();
            }}
            className="note-modal-edit-form"
          >
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
                autoFocus
                className="input"
                defaultValue={note.body}
                name="body"
                rows={12}
              />
            </label>
            <div className="note-modal-actions">
              <button
                className="button secondary"
                onClick={() => setEditing(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="button" type="submit">
                Save note
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="note-modal-body">
              {note.body || "No note body."}
            </div>
            <div className="note-modal-actions">
              <button
                className="button secondary"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
              {updateAction ? (
                <button
                  className="button"
                  onClick={() => setEditing(true)}
                  type="button"
                >
                  Edit note
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>,
    document.querySelector<HTMLElement>(".app-frame") ?? document.body,
  );
}

function NoteForm({
  action,
  title,
  body = "",
  submitLabel,
  onCancel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  body?: string;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <form action={action} className="record-note-form">
      <div className="record-note-form-heading">
        <h4>{submitLabel}</h4>
        <button
          aria-label="Cancel note changes"
          className="icon-button"
          onClick={onCancel}
          type="button"
        >
          <X size={15} />
        </button>
      </div>
      <label>
        <span>Title</span>
        <input
          className="input"
          defaultValue={title === "New note" ? "" : title}
          name="title"
          required
        />
      </label>
      <label>
        <span>Body</span>
        <textarea
          className="input"
          defaultValue={body}
          name="body"
          rows={6}
        />
      </label>
      <div className="form-actions">
        <button className="button secondary" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="button" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
