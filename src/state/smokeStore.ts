// ephemeral smoke state. in-memory only, no clock, no persistence.
export interface SmokeState {
  count: number;
  lastMessage: string | null;
  activity: string[];
  supported: boolean | null;
}

let state: SmokeState = { count: 0, lastMessage: null, activity: [], supported: null };
const listeners = new Set<() => void>();

export function getSmokeState(): SmokeState {
  return state;
}

export function subscribeSmoke(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function set(patch: Partial<SmokeState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function setSupported(v: boolean): void {
  set({ supported: v });
}

export function invokeSmoke(message: unknown): { acceptedMessage: string; invocationCount: number } {
  if (typeof message !== "string" || message.length === 0)
    throw new Error("message must be a non-empty string");
  if (message.length > 500) throw new Error("message too long (max 500 chars)");
  const count = state.count + 1;
  set({
    count,
    lastMessage: message,
    activity: [...state.activity.slice(-9), `invocation ${count}: ${message.slice(0, 80)}`],
  });
  return { acceptedMessage: message, invocationCount: count };
}

export function __resetSmokeForTests(): void {
  state = { count: 0, lastMessage: null, activity: [], supported: null };
  listeners.clear();
}
