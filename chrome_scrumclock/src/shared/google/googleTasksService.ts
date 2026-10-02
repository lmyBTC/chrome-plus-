import { googleAuthClient } from './googleAuthClient';
import { GoogleTaskItem, GoogleTaskList } from './googleTypes';

class GoogleTasksService {
  private static instance: GoogleTasksService;
  private readonly baseUrl = 'https://tasks.googleapis.com/tasks/v1';

  private constructor() {}

  public static getInstance(): GoogleTasksService {
    if (!GoogleTasksService.instance) {
      GoogleTasksService.instance = new GoogleTasksService();
    }
    return GoogleTasksService.instance;
  }

  /**
   * 封裝帶授權的 fetch 請求，支援 401 自動清除 Token 重試一次
   */
  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let token = await googleAuthClient.getAuthToken(false);
    
    let res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (res.status === 401) {
      // Token 可能已過期，清除快取並重新要求互動授權
      await googleAuthClient.removeCachedToken();
      token = await googleAuthClient.getAuthToken(true);
      res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Tasks API 錯誤 (${res.status}): ${errText}`);
    }

    return res;
  }

  /**
   * 取得使用者的 Google Tasks 清單列表
   */
  public async getTaskLists(): Promise<GoogleTaskList[]> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/users/@me/lists`);
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      updated: item.updated,
    }));
  }

  /**
   * 取得指定清單中的任務
   * @param taskListId 清單 ID，預設 '@default'
   */
  public async getTasks(taskListId = '@default'): Promise<GoogleTaskItem[]> {
    const url = `${this.baseUrl}/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=true&showHidden=true`;
    const res = await this.fetchWithAuth(url);
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      notes: item.notes,
      due: item.due,
      completed: item.completed,
      updated: item.updated,
    }));
  }

  /**
   * 新增 Google Task 任務
   */
  public async createTask(
    title: string,
    notes?: string,
    due?: string,
    taskListId = '@default'
  ): Promise<GoogleTaskItem> {
    const payload: Record<string, any> = { title };
    if (notes) payload.notes = notes;
    if (due) payload.due = due;

    const res = await this.fetchWithAuth(`${this.baseUrl}/lists/${encodeURIComponent(taskListId)}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const item = await res.json();
    return {
      id: item.id,
      title: item.title,
      status: item.status,
      notes: item.notes,
      due: item.due,
      completed: item.completed,
      updated: item.updated,
    };
  }

  /**
   * 更新 Google Task 完成狀態
   */
  public async updateTaskStatus(
    taskId: string,
    isCompleted: boolean,
    taskListId = '@default'
  ): Promise<GoogleTaskItem> {
    const payload: Record<string, any> = {
      status: isCompleted ? 'completed' : 'needsAction',
    };
    if (isCompleted) {
      payload.completed = new Date().toISOString();
    } else {
      payload.completed = null;
    }

    const res = await this.fetchWithAuth(
      `${this.baseUrl}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );

    const item = await res.json();
    return {
      id: item.id,
      title: item.title,
      status: item.status,
      notes: item.notes,
      due: item.due,
      completed: item.completed,
      updated: item.updated,
    };
  }

  /**
   * 刪除 Google Task
   */
  public async deleteTask(taskId: string, taskListId = '@default'): Promise<void> {
    await this.fetchWithAuth(
      `${this.baseUrl}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'DELETE',
      }
    );
  }
}

export const googleTasksService = GoogleTasksService.getInstance();
