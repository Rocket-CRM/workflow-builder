<template>
  <div class="agent-config">
    <!-- Agent selector -->
    <PolarisSelect
      label="Agent"
      required
      :modelValue="config?.agent_config_id || ''"
      @update:modelValue="selectAgent($event)"
      :options="agentOptions"
      placeholder="Select an agent..."
    />

    <!-- Selected agent summary -->
    <div v-if="selectedAgent" class="agent-summary">
      <div class="agent-summary__header">
        <span class="agent-summary__name">{{ selectedAgent.name }}</span>
      </div>
      <div class="agent-summary__details">
        <div v-if="selectedAgent.objective" class="agent-summary__row">
          <span class="agent-summary__label">Objective</span>
          <span class="agent-summary__value">{{ selectedAgent.objective }}</span>
        </div>
        <div v-if="selectedAgent.tone" class="agent-summary__row">
          <span class="agent-summary__label">Tone</span>
          <span class="agent-summary__value">{{ selectedAgent.tone }}</span>
        </div>
        <div class="agent-summary__row">
          <span class="agent-summary__label">Actions</span>
          <span class="agent-summary__value">{{ selectedAgent.action_count ?? 0 }} configured</span>
        </div>
        <div class="agent-summary__row">
          <span class="agent-summary__label">Outcomes</span>
          <span class="agent-summary__value">{{ selectedAgent.outcome_count ?? 0 }} defined</span>
        </div>
      </div>
    </div>

    <PolarisBanner v-if="safeAgents.length === 0" variant="info">
      No agents found. Create an agent in the Agent Builder first.
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
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import {
  PolarisSelect,
  PolarisBanner,
} from 'polaris-weweb-styles/components';

const AGENT_VARS = [
  '{{agent.message}}', '{{agent.selected_asset_name}}',
  '{{agent.action}}', '{{agent.urgency}}', '{{agent.reasoning}}',
];

export default {
  name: 'AgentConfig',
  components: { PolarisSelect, PolarisBanner },
  props: {
    config: { type: Object, required: true },
    agents: { type: Array, default: () => [] },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const showVars = ref(false);

    const safeAgents = computed(() => {
      return Array.isArray(props.agents) ? props.agents : [];
    });

    const agentOptions = computed(() => {
      return safeAgents.value.map(a => {
        const parts = [a?.name || 'Untitled'];
        if (a?.objective) parts[0] += ` — ${a.objective}`;
        const meta = [];
        if (a?.action_count != null) meta.push(`${a.action_count} actions`);
        if (a?.outcome_count != null) meta.push(`${a.outcome_count} outcomes`);
        if (meta.length) parts[0] += ` (${meta.join(', ')})`;
        return { value: a?.id, label: parts[0] };
      });
    });

    const selectedAgent = computed(() => {
      const id = props.config?.agent_config_id;
      if (!id) return null;
      return safeAgents.value.find(a => a?.id === id) || null;
    });

    const selectAgent = (agentId) => {
      emit('update', {
        ...props.config,
        agent_config_id: agentId,
      });
    };

    return {
      AGENT_VARS,
      safeAgents,
      agentOptions,
      selectedAgent,
      showVars,
      selectAgent,
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

.agent-summary {
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-200);
  overflow: hidden;

  &__header {
    padding: var(--p-space-300);
    background: var(--p-color-bg-surface-secondary);
    border-bottom: 1px solid var(--p-color-border);
  }

  &__name {
    font-size: var(--p-font-size-300);
    font-weight: var(--p-font-weight-semibold);
    color: var(--p-color-text);
  }

  &__details {
    padding: var(--p-space-200) var(--p-space-300);
    display: flex;
    flex-direction: column;
    gap: var(--p-space-100);
  }

  &__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--p-font-size-275);
  }

  &__label {
    color: var(--p-color-text-secondary);
    font-weight: var(--p-font-weight-medium);
  }

  &__value {
    color: var(--p-color-text);
    text-transform: capitalize;
  }
}

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
