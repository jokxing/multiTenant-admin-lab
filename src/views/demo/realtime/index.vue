<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';

defineOptions({ name: 'DemoRealtime' });

type EventType = 'deposit' | 'withdraw' | 'review' | 'ticket';
type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';
type RealtimeEvent = { id: string; type: EventType; delta: number; createdAt: string };

const typeMeta: Record<EventType, { label: string; icon: string; frequency: number }> = {
  deposit: { label: '存款审核', icon: 'mdi:bank-transfer-in', frequency: 520 },
  withdraw: { label: '提款审核', icon: 'mdi:bank-transfer-out', frequency: 440 },
  review: { label: '活动审核', icon: 'mdi:clipboard-check-outline', frequency: 620 },
  ticket: { label: '工单回复', icon: 'mdi:message-alert-outline', frequency: 700 }
};
const counts = reactive<Record<EventType, number>>({ deposit: 2, withdraw: 1, review: 4, ticket: 3 });
const metrics = reactive({ received: 0, processed: 0, duplicates: 0 });
const connectionStatus = ref<ConnectionStatus>('connected');
const reconnectAttempt = ref(0);
const eventQueue = ref<RealtimeEvent[]>([]);
const audioQueue = ref<EventType[]>([]);
const logs = ref<Array<{ id: string; time: string; type: 'success' | 'warning' | 'info'; content: string }>>([
  {
    id: 'initial',
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    type: 'success',
    content: 'HTTP 首屏计数同步完成，实时通道已连接'
  }
]);
const seenIds = new Set<string>();
const soundSettings = reactive<Record<EventType, boolean>>({
  deposit: true,
  withdraw: true,
  review: true,
  ticket: true,
  ...JSON.parse(localStorage.getItem('mtal_sound_settings') || '{}')
});
let processing = false;
let playingAudio = false;
const timers = new Set<number>();

const total = computed(() => Object.values(counts).reduce((sum, value) => sum + value, 0));
const statusMeta = computed(
  () =>
    ({
      connected: { label: '已连接', type: 'success' as const },
      reconnecting: { label: `重连中 · 第 ${reconnectAttempt.value} 次`, type: 'warning' as const },
      disconnected: { label: '已断开', type: 'error' as const }
    })[connectionStatus.value]
);

watch(soundSettings, value => localStorage.setItem('mtal_sound_settings', JSON.stringify(value)), { deep: true });

function addLog(content: string, type: 'success' | 'warning' | 'info' = 'info') {
  logs.value.unshift({
    id: `${Date.now()}_${Math.random()}`,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    type,
    content
  });
  logs.value = logs.value.slice(0, 12);
}

function createEvent(type?: EventType, id?: string): RealtimeEvent {
  const types = Object.keys(typeMeta) as EventType[];
  return {
    id: id || `evt_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    type: type || types[Math.floor(Math.random() * types.length)],
    delta: 1,
    createdAt: new Date().toISOString()
  };
}

function receiveEvent(event: RealtimeEvent) {
  if (connectionStatus.value !== 'connected') return window.$message?.warning('实时通道未连接，消息未送达');
  metrics.received += 1;
  if (seenIds.has(event.id)) {
    metrics.duplicates += 1;
    addLog(`丢弃重复消息 ${event.id}`, 'warning');
    return;
  }
  seenIds.add(event.id);
  eventQueue.value.push(event);
  addLog(`消息 ${event.id} 进入消费队列`);
  processQueue();
}

async function processQueue() {
  if (processing) return;
  processing = true;
  while (eventQueue.value.length) {
    const event = eventQueue.value.shift()!;
    await new Promise(resolve => setTimeout(resolve, 380));
    counts[event.type] += event.delta;
    metrics.processed += 1;
    audioQueue.value.push(event.type);
    playAudioQueue();
    addLog(`${typeMeta[event.type].label} +${event.delta}，聚合计数已更新`, 'success');
  }
  processing = false;
}

async function playAudioQueue() {
  if (playingAudio || audioQueue.value.length === 0) return;
  playingAudio = true;
  const type = audioQueue.value.shift()!;
  if (soundSettings[type]) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = typeMeta[type].frequency;
      gain.gain.value = 0.04;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
      await new Promise(resolve => setTimeout(resolve, 160));
      await context.close();
    } catch {
      addLog('浏览器阻止了提示音，本次仅更新计数', 'warning');
    }
  }
  playingAudio = false;
  playAudioQueue();
}

function sendSingle() {
  receiveEvent(createEvent());
}

function sendDuplicate() {
  const id = `duplicate_${Date.now()}`;
  receiveEvent(createEvent('review', id));
  receiveEvent(createEvent('review', id));
}

function sendBurst() {
  (['deposit', 'withdraw', 'review', 'ticket', 'review'] as EventType[]).forEach(type =>
    receiveEvent(createEvent(type))
  );
}

function simulateDisconnect() {
  if (connectionStatus.value !== 'connected') return;
  connectionStatus.value = 'disconnected';
  addLog('连接中断，启动指数退避重连', 'warning');
  scheduleReconnect();
}

function scheduleReconnect() {
  reconnectAttempt.value += 1;
  connectionStatus.value = 'reconnecting';
  const delay = Math.min(800 * 2 ** (reconnectAttempt.value - 1), 3200);
  const timer = window.setTimeout(() => {
    timers.delete(timer);
    connectionStatus.value = 'connected';
    addLog(`第 ${reconnectAttempt.value} 次重连成功`, 'success');
    reconnectAttempt.value = 0;
  }, delay);
  timers.add(timer);
}

function syncInitialCount() {
  Object.assign(counts, { deposit: 2, withdraw: 1, review: 4, ticket: 3 });
  addLog('HTTP 待办计数重新校准完成', 'success');
}

onBeforeUnmount(() => timers.forEach(timer => window.clearTimeout(timer)));
</script>

<template>
  <div class="realtime-page">
    <header class="page-header">
      <div>
        <h1>实时消息可靠性中心</h1>
        <p>消息接收、幂等去重、顺序消费、待办聚合与音频队列。</p>
      </div>
      <NSpace align="center">
        <NTag :type="statusMeta.type" :bordered="false">
          <span class="status-dot" />
          {{ statusMeta.label }}
        </NTag>
        <NButton v-if="connectionStatus === 'connected'" @click="simulateDisconnect">
          <template #icon><SvgIcon icon="mdi:lan-disconnect" /></template>
          模拟断线
        </NButton>
        <NButton v-else :disabled="connectionStatus === 'reconnecting'" @click="scheduleReconnect">
          <template #icon><SvgIcon icon="mdi:connection" /></template>
          立即重连
        </NButton>
      </NSpace>
    </header>

    <section class="metric-grid">
      <NCard size="small"><NStatistic label="总待办" :value="total" /></NCard>
      <NCard size="small"><NStatistic label="已接收" :value="metrics.received" /></NCard>
      <NCard size="small"><NStatistic label="已消费" :value="metrics.processed" /></NCard>
      <NCard size="small"><NStatistic label="重复丢弃" :value="metrics.duplicates" /></NCard>
      <NCard size="small"><NStatistic label="队列积压" :value="eventQueue.length" /></NCard>
    </section>

    <section class="content-grid">
      <NCard title="待办聚合与消息注入" size="small">
        <template #header-extra>
          <NButton size="small" @click="syncInitialCount">
            <template #icon><SvgIcon icon="mdi:sync" /></template>
            重新校准
          </NButton>
        </template>
        <div class="count-grid">
          <div v-for="(meta, key) in typeMeta" :key="key" class="count-item">
            <SvgIcon :icon="meta.icon" class="count-icon" />
            <div>
              <span>{{ meta.label }}</span>
              <strong>{{ counts[key] }}</strong>
            </div>
          </div>
        </div>
        <NDivider />
        <NSpace>
          <NButton type="primary" @click="sendSingle">发送单条</NButton>
          <NButton @click="sendDuplicate">发送重复消息</NButton>
          <NButton @click="sendBurst">发送突发消息</NButton>
        </NSpace>
      </NCard>

      <NCard title="声音策略" size="small">
        <div v-for="(meta, key) in typeMeta" :key="key" class="setting-row">
          <span>{{ meta.label }}</span>
          <NSwitch v-model:value="soundSettings[key]" />
        </div>
        <NAlert type="info" :bordered="false" class="sound-note">提示音按消息顺序串行播放，避免并发重叠。</NAlert>
      </NCard>
    </section>

    <NCard title="事件流水" size="small">
      <NTimeline>
        <NTimelineItem v-for="log in logs" :key="log.id" :type="log.type" :time="log.time" :content="log.content" />
      </NTimeline>
    </NCard>
  </div>
</template>

<style scoped>
.realtime-page {
  display: grid;
  gap: 16px;
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
.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 7px;
  border-radius: 50%;
  background: currentColor;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
}
.count-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.count-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(128, 128, 128, 0.22);
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.035);
}
.count-icon {
  width: 24px;
  height: 24px;
  color: #6366f1;
}
.count-item div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.count-item strong {
  font-size: 22px;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(128, 128, 128, 0.16);
}
.sound-note {
  margin-top: 14px;
}
@media (max-width: 1000px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 620px) {
  .page-header {
    flex-direction: column;
  }
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .count-grid {
    grid-template-columns: 1fr;
  }
}
</style>
