/**
 * Notes App
 * Simple note-taking app with localStorage persistence
 */

import { useState, useEffect } from 'react';
import './Notes.css';

interface NotesProps {
  windowId: string;
  nodeId?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  modifiedAt: number;
}

const STORAGE_KEY = 'notes-app-data';

export default function Notes({ windowId }: NotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Load notes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotes(parsed);
        // Auto-select first note if available
        if (parsed.length > 0) {
          setActiveNoteId(parsed[0].id);
          setTitle(parsed[0].title);
          setContent(parsed[0].content);
        }
      } catch (err) {
        console.error('Failed to parse notes from localStorage:', err);
      }
    } else {
      // Create default welcome note
      const welcomeNote: Note = {
        id: crypto.randomUUID(),
        title: 'Notes',
        content: 'Type anything here. Notes save to this browser (localStorage) as you type. Add or delete notes from the sidebar.',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };
      setNotes([welcomeNote]);
      setActiveNoteId(welcomeNote.id);
      setTitle(welcomeNote.title);
      setContent(welcomeNote.content);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([welcomeNote]));
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes]);

  // Auto-save active note on content/title change
  useEffect(() => {
    if (!activeNoteId) return;

    const timeoutId = setTimeout(() => {
      setNotes(prev =>
        prev.map(note =>
          note.id === activeNoteId
            ? { ...note, title, content, modifiedAt: Date.now() }
            : note
        )
      );
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [title, content, activeNoteId]);

  // Create new note
  const createNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setTitle(newNote.title);
    setContent(newNote.content);
  };

  // Delete note
  const deleteNote = (id: string) => {
    if (notes.length === 1) {
      alert('Cannot delete the last note!');
      return;
    }

    const confirmed = confirm('Delete this note?');
    if (!confirmed) return;

    setNotes(prev => {
      const filtered = prev.filter(note => note.id !== id);
      // If deleting active note, switch to first remaining note
      if (id === activeNoteId && filtered.length > 0) {
        setActiveNoteId(filtered[0].id);
        setTitle(filtered[0].title);
        setContent(filtered[0].content);
      }
      return filtered;
    });
  };

  // Select note
  const selectNote = (note: Note) => {
    setActiveNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="notes-app">
      {/* Sidebar */}
      <div className="notes-app__sidebar">
        <div className="notes-app__sidebar-header">
          <button onClick={createNote} className="notes-app__new-button">
            + New Note
          </button>
        </div>
        <div className="notes-app__list">
          {notes.map(note => (
            <div
              key={note.id}
              className={`notes-app__list-item ${note.id === activeNoteId ? 'notes-app__list-item--active' : ''}`}
              onClick={() => selectNote(note)}
            >
              <div className="notes-app__list-item-title">{note.title}</div>
              <div className="notes-app__list-item-preview">
                {note.content.slice(0, 60)}...
              </div>
              <div className="notes-app__list-item-date">
                {new Date(note.modifiedAt).toLocaleDateString()}
              </div>
              <button
                className="notes-app__delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote(note.id);
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="notes-app__editor">
        {activeNote ? (
          <>
            <input
              type="text"
              className="notes-app__title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
            />
            <textarea
              className="notes-app__content-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing..."
            />
            <div className="notes-app__footer">
              <span className="notes-app__word-count">
                {content.split(/\s+/).filter(Boolean).length} words
              </span>
              <span className="notes-app__char-count">
                {content.length} characters
              </span>
              <span className="notes-app__modified">
                Last modified: {new Date(activeNote.modifiedAt).toLocaleString()}
              </span>
            </div>
          </>
        ) : (
          <div className="notes-app__empty">
            <div className="notes-app__empty-icon">📝</div>
            <h3>No Note Selected</h3>
            <p>Create a new note or select one from the sidebar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
