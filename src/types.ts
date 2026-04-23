export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  reminderTime?: 'none' | '1h' | '3h' | '1d' | '2d';
  createdAt: string;
  updatedAt: string;
}

export interface TaskNotification {
  id: string;
  userId: string;
  taskId: string;
  title: string;
  message: string;
  type: 'reminder' | 'system';
  timestamp: string;
  read: boolean;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface TaskLog {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  changeType: 'created' | 'updated' | 'deleted' | 'status_changed';
  details: string;
  timestamp: string;
}

export type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}
