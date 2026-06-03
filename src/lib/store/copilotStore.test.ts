import { useCopilotStore } from './copilotStore';

describe('Copilot Conversation Isolation Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    useCopilotStore.setState({
      messages: [],
      activeUserId: undefined,
      activeRole: undefined,
      activeModule: undefined,
      conversationId: undefined
    });
  });

  it('Manager cannot see Mentor chats (Role isolation)', () => {
    const store = useCopilotStore.getState();
    
    // 1. Manager starts a session and sends a message
    store.initSession('user-123', 'Manager', 'dashboard');
    useCopilotStore.getState().addMessage({ role: 'user', content: 'Manager secret message' });
    
    expect(useCopilotStore.getState().messages.length).toBe(1);
    expect(useCopilotStore.getState().activeRole).toBe('Manager');

    // 2. User switches role to Mentor (simulate role switch without logout)
    useCopilotStore.getState().initSession('user-123', 'Mentor', 'dashboard');

    // 3. Verify messages are wiped
    expect(useCopilotStore.getState().messages.length).toBe(0);
    expect(useCopilotStore.getState().activeRole).toBe('Mentor');
  });

  it('Mentor cannot see Organization chats (Role isolation)', () => {
    const store = useCopilotStore.getState();
    
    // 1. Mentor starts session
    store.initSession('user-456', 'Mentor', 'dashboard');
    useCopilotStore.getState().addMessage({ role: 'user', content: 'Mentor secret message' });
    
    expect(useCopilotStore.getState().messages.length).toBe(1);

    // 2. Organization takes over
    useCopilotStore.getState().initSession('user-456', 'Organization', 'dashboard');

    // 3. Verify wipe
    expect(useCopilotStore.getState().messages.length).toBe(0);
    expect(useCopilotStore.getState().activeRole).toBe('Organization');
  });

  it('Organization cannot see Admin chats (Role isolation)', () => {
    const store = useCopilotStore.getState();
    
    // 1. Admin starts session
    store.initSession('admin-999', 'Admin', 'dashboard');
    useCopilotStore.getState().addMessage({ role: 'user', content: 'Admin root command' });
    
    expect(useCopilotStore.getState().messages.length).toBe(1);

    // 2. Switch to Organization
    useCopilotStore.getState().initSession('admin-999', 'Organization', 'dashboard');

    // 3. Verify wipe
    expect(useCopilotStore.getState().messages.length).toBe(0);
  });

  it('Chats are isolated by User ID', () => {
    const store = useCopilotStore.getState();
    
    // User A logs in
    store.initSession('user-A', 'Manager', 'dashboard');
    useCopilotStore.getState().addMessage({ role: 'user', content: 'User A message' });
    
    expect(useCopilotStore.getState().messages.length).toBe(1);

    // User B logs in (crossing isolation boundary)
    useCopilotStore.getState().initSession('user-B', 'Manager', 'dashboard');

    // Messages should reset
    expect(useCopilotStore.getState().messages.length).toBe(0);
    expect(useCopilotStore.getState().activeUserId).toBe('user-B');
  });

  it('Chats are isolated by Module', () => {
    const store = useCopilotStore.getState();
    
    // Manager on dashboard
    store.initSession('user-1', 'Manager', 'dashboard');
    useCopilotStore.getState().addMessage({ role: 'user', content: 'Dashboard query' });
    
    // Manager navigates to startups
    useCopilotStore.getState().initSession('user-1', 'Manager', 'startups');

    // Messages should reset
    expect(useCopilotStore.getState().messages.length).toBe(0);
    expect(useCopilotStore.getState().activeModule).toBe('startups');
  });

  it('Logging out clears all state', () => {
    const store = useCopilotStore.getState();
    
    store.initSession('user-1', 'Manager', 'dashboard');
    useCopilotStore.getState().addMessage({ role: 'user', content: 'Hi' });
    
    // User logs out
    useCopilotStore.getState().logout();

    expect(useCopilotStore.getState().messages.length).toBe(0);
    expect(useCopilotStore.getState().activeUserId).toBeUndefined();
    expect(useCopilotStore.getState().activeRole).toBeUndefined();
    expect(useCopilotStore.getState().activeModule).toBeUndefined();
    expect(useCopilotStore.getState().conversationId).toBeUndefined();
  });
});
