"use client";

import { useState } from "react";
import { FileText, Plus, X } from "lucide-react";

import type { PortalNote } from "@/lib/portal-notes";

type NoteMode = "view" | "edit" | "create";

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
  const [selectedId, setSelectedId] = useState(notes[0]?.id ?? null);
  const [mode, setMode] = useState<NoteMode>("view");
  const selectedNote =
    notes.find((note) => note.id === selectedId) ?? notes[0] ?? null;

  const selectNote = (noteId: string) => {
    setSelectedId(noteId);
    setMode("view");
  };

  return (
    <section className="record-notes-section">
      <div className="record-notes-heading">
        <div>
          <p className="eyebrow">Notes</p>
          <h3>Record notes</h3>
        </div>
        {canEdit ? (
          <button
            className="button secondary compact-button"
            onClick={() => setMode("create")}
            type="button"
          >
            <Plus size={14} />
            Add note
          </button>
        ) : null}
      </div>

      <div className="record-notes-layout">
        <div className="record-note-list" role="list">
          {notes.map((note) => (
            <button
              aria-pressed={mode !== "create" && selectedNote?.id === note.id}
              className={`record-note-list-item ${
                mode !== "create" && selectedNote?.id === note.id
                  ? "active"
                  : ""
              }`}
              key={note.id}
              onClick={() => selectNote(note.id)}
              type="button"
            >
              <span className="record-note-list-icon">
                <FileText size={15} />
              </span>
              <span>
                <strong>{note.title}</strong>
                <small>{note.body || "No note body."}</small>
              </span>
            </button>
          ))}
          {!notes.length ? (
            <p className="record-notes-empty">No notes have been added yet.</p>
          ) : null}
        </div>

        <div className="record-note-detail">
          {mode === "create" && canEdit ? (
            <NoteForm
              action={createAction}
              onCancel={() => setMode("view")}
              submitLabel="Add note"
              title="New note"
            />
          ) : selectedNote && mode === "edit" && canEdit ? (
            <NoteForm
              action={updateAction.bind(null, selectedNote.id)}
              body={selectedNote.body}
              onCancel={() => setMode("view")}
              submitLabel="Save note"
              title={selectedNote.title}
            />
          ) : selectedNote ? (
            <article className="record-note-view">
              <div className="record-note-view-heading">
                <h4>{selectedNote.title}</h4>
                {canEdit ? (
                  <button
                    className="button secondary compact-button"
                    onClick={() => setMode("edit")}
                    type="button"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              <p>{selectedNote.body || "No note body."}</p>
            </article>
          ) : canEdit ? (
            <button
              className="record-note-empty-action"
              onClick={() => setMode("create")}
              type="button"
            >
              <Plus size={16} />
              Add the first note
            </button>
          ) : null}
        </div>
      </div>
    </section>
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
