import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CopilotMessage = {
  role: 'user' | 'ai';
  content: string;
};

interface CopilotState {
  isOpen: boolean;
  messages: CopilotMessage[];
  role: string;
  entityId?: string;
  language: string;
  currentModule: string;
  
  // Isolation Identifiers
  activeUserId?: string;
  activeRole?: string;
  activeModule?: string;
  conversationId?: string;
  
  // Actions
  setIsOpen: (isOpen: boolean) => void;
  addMessage: (msg: CopilotMessage) => void;
  setRole: (role: string) => void;
  setEntityId: (id: string | undefined) => void;
  setLanguage: (lang: string) => void;
  setCurrentModule: (module: string) => void;
  clearMessages: () => void;
  initSession: (userId: string, role: string) => void;
  logout: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useCopilotStore = create<CopilotState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      messages: [],
      role: 'Organization',
      entityId: undefined,
      language: 'en',
      currentModule: 'dashboard',
      
      activeUserId: undefined,
      activeRole: undefined,
      activeModule: undefined,
      conversationId: undefined,

      setIsOpen: (isOpen) => set({ isOpen }),
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      setRole: (role) => set({ role }),
      setEntityId: (entityId) => set({ entityId }),
      setLanguage: (language) => set({ language }),
      setCurrentModule: (currentModule) => set({ currentModule }),
      clearMessages: () => set({ messages: [], conversationId: generateId() }),
      
      initSession: (userId: string, role: string) => {
        const state = get();
        if (state.activeUserId !== userId || state.activeRole !== role) {
          // Isolation boundary crossed - force fresh conversation (only on User/Role change)
          set({
            messages: [],
            activeUserId: userId,
            activeRole: role,
            conversationId: generateId()
          });
        }
      },
      
      logout: () => {
        set({
           messages: [],
           activeUserId: undefined,
           activeRole: undefined,
           activeModule: undefined,
           conversationId: undefined,
           entityId: undefined
        });
      }
    }),
    {
      name: 'rtih-copilot-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
