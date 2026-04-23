import { Task, TaskLog, TaskNotification, User } from '../types';

class TaskService {
  private STORAGE_KEY = 'taskpulse_tasks';
  private LOGS_KEY = 'taskpulse_logs';
  private NOTIFICATIONS_KEY = 'taskpulse_notifications';

  getTasks(userId?: string): Task[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    const tasks: Task[] = data ? JSON.parse(data) : [];
    if (userId) {
      return tasks.filter(t => t.userId === userId);
    }
    return tasks;
  }

  saveTasks(tasks: Task[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
  }

  getNotifications(userId?: string): TaskNotification[] {
    const data = localStorage.getItem(this.NOTIFICATIONS_KEY);
    const notifications: TaskNotification[] = data ? JSON.parse(data) : [];
    if (userId) {
      return notifications.filter(n => n.userId === userId);
    }
    return notifications;
  }

  saveNotifications(notifications: TaskNotification[]): void {
    localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }

  addNotification(userId: string, taskId: string, title: string, message: string): TaskNotification {
    const newNotif: TaskNotification = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      taskId,
      title,
      message,
      type: 'reminder',
      timestamp: new Date().toISOString(),
      read: false
    };
    const notifications = this.getNotifications();
    notifications.unshift(newNotif);
    this.saveNotifications(notifications.slice(0, 20)); // Keep last 20
    return newNotif;
  }

  markNotificationAsRead(id: string): void {
    const notifications = this.getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      this.saveNotifications(notifications);
    }
  }

  getLogs(userId?: string): TaskLog[] {
    const data = localStorage.getItem(this.LOGS_KEY);
    const logs: TaskLog[] = data ? JSON.parse(data) : [];
    if (userId) {
      return logs.filter(l => l.userId === userId);
    }
    return logs;
  }

  addLog(log: Omit<TaskLog, 'id' | 'timestamp'>): void {
    const newLog: TaskLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
    };
    const logs = this.getLogs();
    logs.unshift(newLog);
    localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs.slice(0, 50))); // Keep last 50 logs
  }

  addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, userName: string): Task {
    const newTask: Task = {
      ...task,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const tasks = this.getTasks();
    tasks.unshift(newTask);
    this.saveTasks(tasks);

    this.addLog({
      taskId: newTask.id,
      userId: newTask.userId,
      userName,
      changeType: 'created',
      details: `Created task: ${newTask.title}`
    });

    return newTask;
  }

  updateTask(id: string, updates: Partial<Task>, userName: string, userId: string): Task {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Task not found');
    
    const oldTask = tasks[index];
    const updatedTask = {
      ...oldTask,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    tasks[index] = updatedTask;
    this.saveTasks(tasks);

    let details = `Updated task: ${updatedTask.title}`;
    let changeType: TaskLog['changeType'] = 'updated';

    if (updates.status && updates.status !== oldTask.status) {
      changeType = 'status_changed';
      details = `Changed status of "${updatedTask.title}" to ${updates.status}`;
    }

    this.addLog({
      taskId: id,
      userId,
      userName,
      changeType,
      details
    });

    return updatedTask;
  }

  deleteTask(id: string, userName: string, userId: string): void {
    const tasks = this.getTasks();
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    const filteredTasks = tasks.filter(t => t.id !== id);
    this.saveTasks(filteredTasks);

    this.addLog({
      taskId: id,
      userId,
      userName,
      changeType: 'deleted',
      details: `Deleted task: ${taskToDelete.title}`
    });
  }
}

export const taskService = new TaskService();
