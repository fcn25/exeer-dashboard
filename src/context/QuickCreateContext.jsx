import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import AddEmployeeModalHost from "../components/employees/AddEmployeeModalHost.jsx";
import CreateEventModal from "../components/events/CreateEventModal.jsx";
import CreateTaskModal from "../components/tasks/CreateTaskModal.jsx";
import NoteFormModal from "../components/notes/NoteFormModal.jsx";
import { findQuickCreateAction } from "../constants/quickCreateActions.ts";
import { isNative } from "../lib/platform.ts";
import { createEvent } from "../services/eventsService.js";
import { useAuth } from "./AuthContext.jsx";
import { isDirectManager } from "../utils/rbac.js";

const QuickCreateContext = createContext(null);

export function QuickCreateProvider({ children }) {
  const navigate = useNavigate();
  const { role } = useAuth();

  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [noteFormState, setNoteFormState] = useState({
    isOpen: false,
    noteId: null,
  });
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

  const scopeTasksToTeam = isDirectManager(role);

  const openNoteForm = useCallback((noteId = null) => {
    setNoteFormState({ isOpen: true, noteId });
  }, []);

  const closeNoteForm = useCallback(() => {
    setNoteFormState({ isOpen: false, noteId: null });
  }, []);

  const openQuickCreate = useCallback(
    (actionId) => {
      const action = findQuickCreateAction(actionId);
      if (!action) return;

      const target = action.openTarget;

      if (target.kind === "employee-modal") {
        setIsEmployeeOpen(true);
        return;
      }
      if (target.kind === "task-modal") {
        setIsTaskOpen(true);
        return;
      }
      if (target.kind === "event-modal") {
        setIsEventOpen(true);
        return;
      }
      if (target.kind === "note-modal") {
        openNoteForm(null);
        return;
      }
      if (target.kind === "route") {
        const path =
          isNative() && target.mobile ? target.mobile : target.desktop;
        navigate(path);
      }
    },
    [navigate, openNoteForm],
  );

  const openEmployeeModal = useCallback(() => {
    openQuickCreate("employee");
  }, [openQuickCreate]);

  const handleNoteSaved = useCallback(() => {
    setNotesRefreshKey((key) => key + 1);
  }, []);

  const value = useMemo(
    () => ({
      openQuickCreate,
      openEmployeeModal,
      isNotesDrawerOpen,
      setIsNotesDrawerOpen,
      toggleNotesDrawer: () => setIsNotesDrawerOpen((open) => !open),
      openNoteForm,
      closeNoteForm,
      notesRefreshKey,
      handleNoteSaved,
    }),
    [
      openQuickCreate,
      openEmployeeModal,
      isNotesDrawerOpen,
      openNoteForm,
      closeNoteForm,
      notesRefreshKey,
      handleNoteSaved,
    ],
  );

  const handleEventCreated = useCallback(async (payload) => {
    await createEvent(payload);
  }, []);

  return (
    <QuickCreateContext.Provider value={value}>
      {children}

      <AddEmployeeModalHost
        isOpen={isEmployeeOpen}
        onClose={() => setIsEmployeeOpen(false)}
      />

      <CreateTaskModal
        isOpen={isTaskOpen}
        onClose={() => setIsTaskOpen(false)}
        scopeToTeam={scopeTasksToTeam}
      />

      <CreateEventModal
        isOpen={isEventOpen}
        onClose={() => setIsEventOpen(false)}
        onCreated={handleEventCreated}
      />

      <NoteFormModal
        isOpen={noteFormState.isOpen}
        noteId={noteFormState.noteId}
        onClose={closeNoteForm}
        onSaved={handleNoteSaved}
      />
    </QuickCreateContext.Provider>
  );
}

export function useQuickCreate() {
  const context = useContext(QuickCreateContext);
  if (!context) {
    throw new Error("useQuickCreate must be used within QuickCreateProvider");
  }
  return context;
}

/** Safe hook for optional QuickCreate context (e.g. layouts outside provider). */
export function useQuickCreateOptional() {
  return useContext(QuickCreateContext);
}
