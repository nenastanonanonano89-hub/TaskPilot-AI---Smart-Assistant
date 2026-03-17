import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64 string
  previewUrl: string; // object URL for UI
}

export interface Task {
  id: string;
  prompt: string;
  status: 'idle' | 'inProgress' | 'completed' | 'error';
  report?: string;
  createdAt: Date;
  attachments?: Attachment[];
}

interface TaskContextType {
  tasks: Task[];
  currentTaskId: string | null;
  currentTask: Task | undefined;
  setCurrentTaskId: (id: string | null) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  clearAllTasks: () => void;
  handleNewTask: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('taskpilot_tasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert string dates back to Date objects
        return parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt)
        }));
      } catch (e) {
        console.error('Failed to parse tasks from local storage', e);
      }
    }
    return [];
  });
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('taskpilot_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const currentTask = tasks.find(t => t.id === currentTaskId);

  const addTask = (task: Task) => {
    setTasks(prev => [task, ...prev]);
    setCurrentTaskId(task.id);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (currentTaskId === id) {
      setCurrentTaskId(null);
    }
  };

  const clearAllTasks = () => {
    setTasks([]);
    setCurrentTaskId(null);
    localStorage.removeItem('taskpilot_ordered_tasks');
  };

  const handleNewTask = () => {
    setCurrentTaskId(null);
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      currentTaskId,
      currentTask,
      setCurrentTaskId,
      addTask,
      updateTask,
      deleteTask,
      clearAllTasks,
      handleNewTask
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}
