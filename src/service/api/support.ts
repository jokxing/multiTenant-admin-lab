export type SupportConversationStatus = 'waiting' | 'active' | 'closed';

export type SupportSender = 'customer' | 'agent' | 'system';

export type SupportMessage = {
  id: string;
  sender: SupportSender;
  senderName: string;
  content: string;
  createdAt: string;
  read: boolean;
};

export type SupportConversation = {
  id: string;
  customerName: string;
  subject: string;
  status: SupportConversationStatus;
  assignee: string | null;
  priority: 'normal' | 'high';
  unreadAdmin: number;
  unreadCustomer: number;
  lastMessage: string;
  updatedAt: string;
  messages: SupportMessage[];
  messageCount?: number;
};

type SupportReader = 'customer' | 'agent';

type SupportConversationListResponse = {
  records: SupportConversation[];
};

type SupportConversationResponse = {
  conversation: SupportConversation;
};

// The runtime URL may include a preview page path such as /home; APIs live at the origin.
const SUPPORT_API_BASE = new URL(import.meta.env.VITE_MOBILE_RUNTIME_URL || 'http://localhost:4180').origin;
const SUPPORT_CONVERSATION_URL = '/api/support/conversations';
const SUPPORT_EVENT_URL = '/api/support/events';

async function supportRequest<T>(url: string, options?: RequestInit) {
  const response = await fetch(`${SUPPORT_API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    const messages: Record<number, string> = {
      401: '登录状态已失效，请重新登录后重试。',
      403: '你没有此会话的访问权限。',
      404: '会话不存在或已被移除。',
      409: '当前会话无法执行此操作，请刷新会话状态。',
      422: '请求内容有误，请检查后重试。',
      503: '服务暂时不可用，请稍后重试。'
    };
    throw new Error(messages[response.status] || '请求未完成，请稍后重试。');
  }

  return (await response.json()) as T;
}

function getConversationUrl(id: string) {
  return `${SUPPORT_CONVERSATION_URL}/${id}`;
}

export function getSupportEventUrl() {
  return `${SUPPORT_API_BASE}${SUPPORT_EVENT_URL}`;
}

export function fetchSupportConversations() {
  return supportRequest<SupportConversationListResponse>(SUPPORT_CONVERSATION_URL);
}

export function fetchSupportConversation(id: string) {
  return supportRequest<SupportConversationResponse>(getConversationUrl(id));
}

export function markSupportConversationRead(id: string, reader: SupportReader) {
  return supportRequest<SupportConversationResponse>(`${getConversationUrl(id)}/read`, {
    method: 'POST',
    body: JSON.stringify({ reader })
  });
}

export function claimSupportConversation(id: string) {
  return supportRequest<SupportConversationResponse>(`${getConversationUrl(id)}/claim`, {
    method: 'POST'
  });
}

export function closeSupportConversation(id: string) {
  return supportRequest<SupportConversationResponse>(`${getConversationUrl(id)}/close`, {
    method: 'POST'
  });
}

export function sendSupportAgentMessage(id: string, content: string) {
  return supportRequest<{ message: SupportMessage }>(`${getConversationUrl(id)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ sender: 'agent', content })
  });
}
