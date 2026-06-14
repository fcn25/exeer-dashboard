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
import QuickStickyNote from "../components/notes/QuickStickyNote.jsx";
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
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  const scopeTasksToTeam = isDirectManager(role);

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
        setIsNoteOpen(true);
        return;
      }
      if (target.kind === "route") {
        const path =
          isNative() && target.mobile ? target.mobile : target.desktop;
        navigate(path);
      }
    },
    [navigate],
  );

  const openEmployeeModal = useCallback(() => {
    openQuickCreate("employee");
  }, [openQuickCreate]);

  const value = useMemo(
    () => ({
      openQuickCreate,
      openEmployeeModal,
      isNoteOpen,
      setIsNoteOpen,
      openNote: () => setIsNoteOpen(true),
      closeNote: () => setIsNoteOpen(false),
    }),
    [openQuickCreate, openEmployeeModal, isNoteOpen],
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

      <QuickStickyNote
        isOpen={isNoteOpen}
        onClose={() => setIsNoteOpen(false)}
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
