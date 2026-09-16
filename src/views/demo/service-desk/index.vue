<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  claimSupportConversation,
  closeSupportConversation,
  fetchSupportConversation,
  fetchSupportConversations,
  getSupportEventUrl,
  markSupportConversationRead,
  sendSupportAgentMessage
} from '@/service/api';
import type { SupportConversation } from '@/service/api';

defineOptions({ name: 'DemoServiceDesk' });

const conversations = ref<SupportConversation[]>([]);
const selectedId = ref('');
const selected = ref<SupportConversation | null>(null);
const loading = ref(false);
const sending = ref(false);
const connected = ref(false);
const draft = ref('');
const messagePanel = ref<HTMLElement | null>(null);
const quickReplies = [
  '您好，我是本次服务专员，请问具体需要了解什么？',
  '该活动建议提前预约，我可以继续为您确认可用时间。'
];
let eventSource: EventSource | null = null;
let realtimeRefreshing = false;

const statusMeta = {
  waiting: { label: '待接入', type: 'warning' as const },
  active: { label: '服务中', type: 'success' as const },
  closed: { label: '已结束', type: 'default' as const }
};
const waitingCount = computed(() => conversations.value.filter(item => item.status === 'waiting').length);
const activeCount = computed(() => conversations.value.filter(item => item.status === 'active').length);
const unreadCount = computed(() => conversations.value.reduce((total, item) => total + item.unreadAdmin, 0));

async function loadConversations() {
  const response = await fetchSupportConversations();
  conversations.value = response.records;
  if (!selectedId.value && response.records[0]) selectedId.value = response.records[0].id;
}

async function loadConversation(id = selectedId.value) {
  if (!id) return;
  loading.value = true;
  try {
    const response = await fetchSupportConversation(id);
    selected.value = response.conversation;
    selectedId.value = id;
    await markSupportConversationRead(id, 'agent');
    await loadConversations();
    await nextTick();
    messagePanel.value?.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
  } finally {
    loading.value = false;
  }
}

async function claimConversation() {
  if (!selected.value) return;
  await claimSupportConversation(selected.value.id);
  window.$message?.success('会话已接入');
  await loadConversation();
}

async function closeConversation() {
  if (!selected.value) return;
  await closeSupportConversation(selected.value.id);
  window.$message?.success('会话已结束');
  await loadConversation();
}

async function sendMessage() {
  const content = draft.value.trim();
  if (!selected.value || selected.value.status !== 'active' || !content || sending.value) return;
  sending.value = true;
  try {
    draft.value = '';
    await sendSupportAgentMessage(selected.value.id, content);
    await loadConversation();
  } finally {
    sending.value = false;
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function connectRealtime() {
  eventSource = new EventSource(getSupportEventUrl());
  eventSource.addEventListener('open', () => {
    connected.value = true;
  });
  eventSource.addEventListener('message', async (message: MessageEvent) => {
    const event = JSON.parse(message.data) as { type?: string; conversationId?: string };
    if (!event.conversationId || realtimeRefreshing) return;
    realtimeRefreshing = true;
    try {
      await loadConversations();
      if (event.conversationId === selectedId.value) await loadConversation();
    } catch {
      connected.value = false;
    } finally {
      realtimeRefreshing = false;
    }
  });
  eventSource.addEventListener('error', () => {
    connected.value = false;
  });
}

onMounted(async () => {
  try {
    await loadConversations();
    await loadConversation();
    connectRealtime();
  } catch {
    window.$message?.error('无法连接移动端演示服务，请确认 4180 服务已启动');
  }
});

onBeforeUnmount(() => eventSource?.close());
</script>

<template>
  <div class="service-desk-page">
    <header class="page-header">
      <div>
        <h1>客户服务会话台</h1>
        <p>接入移动端服务请求，统一处理会话、未读消息与服务状态。</p>
      </div>
      <NTag :type="connected ? 'success' : 'warning'" :bordered="false">
        <span class="connection-dot" />
        {{ connected ? '实时通道已连接' : '正在连接' }}
      </NTag>
    </header>

    <section class="metric-grid">
      <NCard size="small"><NStatistic label="全部会话" :value="conversations.length" /></NCard>
      <NCard size="small"><NStatistic label="待接入" :value="waitingCount" /></NCard>
      <NCard size="small"><NStatistic label="服务中" :value="activeCount" /></NCard>
      <NCard size="small"><NStatistic label="未读消息" :value="unreadCount" /></NCard>
    </section>

    <section class="desk-layout">
      <NCard title="会话队列" size="small" content-class="conversation-card-content">
        <template #header-extra>
          <NButton quaternary circle title="刷新" @click="loadConversations">
            <template #icon><SvgIcon icon="mdi:refresh" /></template>
          </NButton>
        </template>
        <button
          v-for="conversation in conversations"
          :key="conversation.id"
          type="button"
          class="conversation-item" :class="[{ active: conversation.id === selectedId }]"
          @click="loadConversation(conversation.id)"
        >
          <span class="avatar"><SvgIcon icon="mdi:account-outline" /></span>
          <span class="conversation-main">
            <span>
              <strong>{{ conversation.customerName }}</strong>
              <time>{{ formatTime(conversation.updatedAt) }}</time>
            </span>
            <b>{{ conversation.subject }}</b>
            <small>{{ conversation.lastMessage }}</small>
          </span>
          <NBadge v-if="conversation.unreadAdmin" :value="conversation.unreadAdmin" />
        </button>
      </NCard>

      <NCard v-if="selected" size="small" content-class="chat-card-content">
        <template #header>
          <div class="chat-header">
            <div>
              <strong>{{ selected.subject }}</strong>
              <span>{{ selected.customerName }} · 移动端</span>
            </div>
            <NTag :type="statusMeta[selected.status].type" :bordered="false">
              {{ statusMeta[selected.status].label }}
            </NTag>
          </div>
        </template>
        <template #header-extra>
          <NSpace>
            <NButton v-if="selected.status === 'waiting'" type="primary" size="small" @click="claimConversation">
              接入会话
            </NButton>
            <NButton v-if="selected.status === 'active'" size="small" @click="closeConversation">结束会话</NButton>
          </NSpace>
        </template>

        <NSpin :show="loading" class="chat-spin">
          <div ref="messagePanel" class="message-panel">
            <article
              v-for="message in selected.messages"
              :key="message.id"
              class="message-row" :class="[`is-${message.sender}`]"
            >
              <span v-if="message.sender !== 'system'">{{ message.senderName }}</span>
              <p>{{ message.content }}</p>
              <time v-if="message.sender !== 'system'">{{ formatTime(message.createdAt) }}</time>
            </article>
          </div>
        </NSpin>

        <div v-if="selected.status === 'active'" class="reply-panel">
          <div class="quick-replies">
            <span>快捷回复</span>
            <NButton v-for="reply in quickReplies" :key="reply" size="tiny" @click="draft = reply">
              {{ reply }}
            </NButton>
          </div>
          <div class="reply-composer">
            <NInput
              v-model:value="draft"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              maxlength="300"
              show-count
              placeholder="输入回复，Ctrl + Enter 发送"
              @keydown.ctrl.enter.prevent="sendMessage"
            />
            <NButton type="primary" :loading="sending" :disabled="!draft.trim()" @click="sendMessage">
              <template #icon><SvgIcon icon="mdi:send-outline" /></template>
              发送
            </NButton>
          </div>
        </div>
        <NAlert v-else-if="selected.status === 'waiting'" type="warning" :bordered="false">
          请先接入会话，再以服务专员身份回复用户。
        </NAlert>
        <NAlert v-else type="info" :bordered="false">该会话已结束，消息记录保持只读。</NAlert>
      </NCard>
    </section>
  </div>
</template>

<style scoped>
.service-desk-page {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.page-header h1 {
  margin: 0;
  font-size: 24px;
  letter-spacing: 0;
}
.page-header p {
  margin: 8px 0 0;
  color: rgba(128, 128, 128, 0.95);
}
.connection-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  background: currentColor;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}
.desk-layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
  min-height: 620px;
}
.desk-layout > :deep(.n-card) {
  min-width: 0;
}
:deep(.conversation-card-content) {
  padding: 0 !important;
}
.conversation-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 16px;
  border: 0;
  border-bottom: 1px solid rgba(128, 128, 128, 0.16);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.conversation-item.active {
  background: color-mix(in srgb, #6366f1 9%, transparent);
  box-shadow: inset 3px 0 #6366f1;
}
.avatar {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 6px;
  background: color-mix(in srgb, #6366f1 12%, transparent);
  color: #6366f1;
  font-size: 20px;
}
.conversation-main {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.conversation-main > span {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.conversation-main b,
.conversation-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conversation-main b {
  font-size: 13px;
}
.conversation-main small,
.conversation-main time,
.chat-header span {
  color: rgba(128, 128, 128, 0.95);
  font-size: 11px;
}
:deep(.chat-card-content) {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 550px;
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.chat-header > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.chat-header strong,
.chat-header span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.message-panel {
  overflow-y: auto;
  min-width: 0;
  max-height: 410px;
  padding: 4px 8px 20px;
}
.message-row {
  width: fit-content;
  max-width: 70%;
  margin-bottom: 16px;
}
.message-row > span,
.message-row time {
  color: rgba(128, 128, 128, 0.95);
  font-size: 11px;
}
.message-row p {
  margin: 4px 0;
  padding: 9px 12px;
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 4px 7px 7px;
  background: rgba(128, 128, 128, 0.05);
  word-break: break-word;
  line-height: 1.55;
}
.message-row.is-agent {
  margin-left: auto;
  text-align: right;
}
.message-row.is-agent p {
  border-color: #6366f1;
  border-radius: 7px 4px 7px 7px;
  background: #6366f1;
  color: #fff;
  text-align: left;
}
.message-row.is-system {
  max-width: 100%;
  margin-right: auto;
  margin-left: auto;
}
.message-row.is-system p {
  border: 0;
  background: transparent;
  color: rgba(128, 128, 128, 0.95);
  font-size: 12px;
}
.reply-panel {
  padding-top: 12px;
  border-top: 1px solid rgba(128, 128, 128, 0.18);
}
.quick-replies {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
  min-width: 0;
}
.quick-replies > span {
  flex: none;
  color: rgba(128, 128, 128, 0.95);
  font-size: 12px;
}
.quick-replies :deep(.n-button) {
  max-width: 100%;
}
.quick-replies :deep(.n-button__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reply-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 10px;
  min-width: 0;
}
.reply-composer :deep(.n-input) {
  min-width: 0;
}
@media (max-width: 1280px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .desk-layout {
    grid-template-columns: minmax(0, 1fr);
    min-height: auto;
  }
  :deep(.chat-card-content) {
    min-height: 520px;
  }
}
@media (max-width: 900px) {
  .page-header {
    display: grid;
  }
  .metric-grid {
    grid-template-columns: 1fr;
  }
  .reply-composer {
    grid-template-columns: 1fr;
  }
  .reply-composer :deep(.n-button) {
    width: 100%;
  }
}
</style>
