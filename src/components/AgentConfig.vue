<template>
  <div class="agent-config">
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <span class="loading-state__spinner"></span>
      <span class="loading-state__text">Loading agents...</span>
    </div>

    <template v-else>
      <!-- Agent selector -->
      <PolarisCard>
        <PolarisCardSection>
          <PolarisSelect
            label="Agent"
            required
            :modelValue="config?.agent_config_id || ''"
            @update:modelValue="selectAgent($event)"
            :options="agentOptions"
            placeholder="Select an agent..."
          />
        </PolarisCardSection>
      </PolarisCard>

      <!-- Selected agent summary -->
      <PolarisCard v-if="selectedAgent">
        <PolarisCardSection>
          <div class="agent-detail">
            <div class="agent-detail__header">
              <span class="agent-detail__icon">🤖</span>
              <div class="agent-detail__title-group">
                <span class="agent-detail__name">{{ selectedAgent?.name }}</span>
                <span v-if="selectedAgent?.objective" class="agent-detail__objective-badge">{{ selectedAgent.objective }}</span>
              </div>
            </div>
            <p v-if="selectedAgent?.description" class="agent-detail__desc">{{ selectedAgent.description }}</p>
            <button class="agent-detail__change-btn" @click="clearSelection">Change agent</button>
          </div>
        </PolarisCardSection>
      </PolarisCard>

      <PolarisBanner v-if="allAgents.length === 0 && !loading" variant="info">
        No active agents found. Create an agent in the Agent Builder first.
      </PolarisBanner>

      <!-- Output Variables Reference -->
      <div class="variable-ref">
        <button class="variable-ref__toggle" @click="showVars = !showVars">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path v-if="showVars" d="M2 4l4 4 4-4"/>
            <path v-else d="M4 2l4 4-4 4"/>
          </svg>
          Agent output variables
        </button>
        <div v-if="showVars" class="variable-ref__list">
          <code v-for="v in AGENT_VARS" :key="v">{{ v }}</code>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted } from 'vue';
import {
  PolarisSelect,
  PolarisBanner,
  PolarisCard,
  PolarisCardSection,
} from 'polaris-weweb-styles/components';

const AGENT_VARS = [
  '{{agent.message}}', '{{agent.selected_asset_name}}',
  '{{agent.action}}', '{{agent.urgency}}', '{{agent.reasoning}}',
];

export default {
  name: 'AgentConfig',
  components: { PolarisSelect, PolarisBanner, PolarisCard, PolarisCardSection },
  props: {
    config: { type: Object, required: true },
    agents: { type: Array, default: () => [] },
    supabaseUrl: { type: String, default: '' },
    supabaseAnonKey: { type: String, default: '' },
    authToken: { type: String, default: '' },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const showVars = ref(false);
    const loading = ref(false);
    const fetchedAgents = ref([]);

    const allAgents = computed(() => {
      if (fetchedAgents.value.length) return fetchedAgents.value;
      return Array.isArray(props.agents) ? props.agents : [];
    });

    const agentOptions = computed(() => {
      return allAgents.value.map(a => ({
        value: a?.id,
        label: a?.objective
          ? `${a?.name || 'Untitled'} — ${a.objective}`
          : a?.name || 'Untitled',
      }));
    });

    const selectedAgent = computed(() => {
      const id = props.config?.agent_config_id;
      if (!id) return null;
      return allAgents.value.find(a => a?.id === id) || null;
    });

    const fetchAgents = async () => {
      const url = props.supabaseUrl?.replace(/\/+$/, '');
      if (!url || !props.authToken) return;
      loading.value = true;
      try {
        const res = await fetch(
          `${url}/rest/v1/amp_agent?select=id,name,description,objective,is_active&is_active=eq.true&order=name.asc`,
          {
            headers: {
              'Authorization': `Bearer ${props.authToken}`,
              'apikey': props.supabaseAnonKey || props.authToken,
            },
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          fetchedAgents.value = data;
        }
      } catch (err) {
        console.error('[AgentConfig] Failed to fetch agents:', err);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      if (!props.agents?.length && props.supabaseUrl && props.authToken) {
        fetchAgents();
      }
    });

    const selectAgent = (agentId) => {
      emit('update', {
        label: props.config?.label || 'Agent',
        agent_config_id: agentId,
      });
    };

    const clearSelection = () => {
      emit('update', {
        label: props.config?.label || 'Agent',
        agent_config_id: '',
      });
    };

    return {
      AGENT_VARS,
      allAgents,
      agentOptions,
      selectedAgent,
      showVars,
      loading,
      selectAgent,
      clearSelection,
    };
  },
};
</script>

<style lang="scss" scoped>
@import 'polaris-weweb-styles';

.agent-config {
  @include polaris-tokens;
  display: flex;
  flex-direction: column;
  gap: var(--p-space-400);
}

.agent-detail {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-200);

  &__header {
    display: flex;
    align-items: center;
    gap: var(--p-space-300);
  }

  &__icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #CFFAFE;
    border-radius: var(--p-border-radius-200);
    font-size: 18px;
    flex-shrink: 0;
  }

  &__title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: var(--p-font-size-325);
    font-weight: var(--p-font-weight-semibold);
    color: var(--p-color-text);
  }

  &__objective-badge {
    display: inline-block;
    font-size: var(--p-font-size-275);
    font-weight: var(--p-font-weight-medium);
    color: var(--p-color-text-info);
    background: var(--p-color-bg-fill-info-secondary);
    padding: 1px var(--p-space-150);
    border-radius: var(--p-border-radius-100);
    width: fit-content;
    text-transform: capitalize;
  }

  &__desc {
    font-size: var(--p-font-size-275);
    color: var(--p-color-text-secondary);
    margin: 0;
    line-height: 1.4;
  }

  &__change-btn {
    background: none;
    border: none;
    padding: 0;
    font-size: var(--p-font-size-275);
    font-weight: var(--p-font-weight-medium);
    color: var(--p-color-text-brand);
    cursor: pointer;
    text-align: left;
    width: fit-content;

    &:hover { text-decoration: underline; }
  }
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--p-space-200);
  padding: var(--p-space-500);
  color: var(--p-color-text-secondary);

  &__text { font-size: var(--p-font-size-300); }

  &__spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--p-color-border);
    border-top-color: var(--p-color-text-brand);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
}

@keyframes spin { to { transform: rotate(360deg); } }

.variable-ref {
  border-top: 1px solid var(--p-color-border);
  padding-top: var(--p-space-300);
}

.variable-ref__toggle {
  display: flex;
  align-items: center;
  gap: var(--p-space-150);
  background: none;
  border: none;
  padding: 0;
  font-size: var(--p-font-size-275);
  font-weight: var(--p-font-weight-medium);
  color: var(--p-color-text-secondary);
  cursor: pointer;
  &:hover { color: var(--p-color-text); }
}

.variable-ref__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-space-100);
  padding-top: var(--p-space-200);
}

.variable-ref code {
  background: var(--p-color-bg-surface-secondary);
  padding: 2px 6px;
  border-radius: var(--p-border-radius-100);
  font-family: var(--p-font-family-mono);
  font-size: 11px;
  color: var(--p-color-text);
}
</style>
