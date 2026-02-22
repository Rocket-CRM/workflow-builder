<template>
  <div class="agent-config">
    <!-- Objective -->
    <div class="polaris-form-field">
      <label class="polaris-form-field__label polaris-form-field__label--required">Objective</label>
      <select class="polaris-form-field__select" :value="config?.objective || ''" @change="updateField('objective', $event.target.value)">
        <option value="" disabled>Select objective...</option>
        <option v-for="o in OBJECTIVES" :key="o.value" :value="o.value" :title="o.tooltip">{{ o.label }}</option>
      </select>
    </div>

    <!-- Tone -->
    <div class="polaris-form-field">
      <label class="polaris-form-field__label polaris-form-field__label--required">Tone</label>
      <select class="polaris-form-field__select" :value="config?.tone || 'friendly'" @change="updateField('tone', $event.target.value)">
        <option v-for="t in TONES" :key="t.value" :value="t.value" :title="t.tooltip">{{ t.label }}</option>
      </select>
    </div>

    <!-- Allowed Actions -->
    <div class="polaris-form-field">
      <label class="polaris-form-field__label">Allowed Actions</label>
      <span class="polaris-form-field__help">Uncheck to restrict which actions the AI can take</span>
      <div class="checkbox-group">
        <label v-for="a in ALLOWED_ACTIONS" :key="a.value" class="checkbox-option">
          <input
            type="checkbox"
            :checked="isActionAllowed(a.value)"
            @change="toggleAction(a.value, $event.target.checked)"
          />
          <span>{{ a.label }}</span>
        </label>
      </div>
    </div>

    <!-- Limits -->
    <div class="polaris-form-field">
      <label class="polaris-form-field__label">Max Points Per User</label>
      <input
        class="polaris-form-field__input"
        type="number"
        min="0"
        placeholder="No limit"
        :value="config?.max_points_per_user ?? ''"
        @input="updateField('max_points_per_user', $event.target.value ? parseInt($event.target.value) : null)"
      />
      <span class="polaris-form-field__help">Leave empty for no limit</span>
    </div>

    <div class="polaris-form-field">
      <label class="polaris-form-field__label">Max Actions Per Execution</label>
      <input
        class="polaris-form-field__input"
        type="number"
        min="1"
        placeholder="No limit"
        :value="config?.max_actions ?? ''"
        @input="updateField('max_actions', $event.target.value ? parseInt($event.target.value) : null)"
      />
      <span class="polaris-form-field__help">How many actions the AI can take in a single run</span>
    </div>

    <!-- Constraints -->
    <div class="polaris-form-field">
      <label class="polaris-form-field__label">Constraints</label>
      <span class="polaris-form-field__help">Rules that limit what this specific node can do</span>
      <ConstraintBuilder
        :constraints="config?.constraints || []"
        @update="updateField('constraints', $event)"
      />
    </div>

    <!-- Context Hint -->
    <div class="polaris-form-field">
      <label class="polaris-form-field__label">Context Hint</label>
      <textarea
        class="polaris-form-field__textarea"
        rows="3"
        placeholder="e.g., These are lapsed VIP customers who used to spend heavily"
        :value="config?.context_hint || ''"
        @input="updateField('context_hint', $event.target.value)"
      />
      <span class="polaris-form-field__help">Additional context passed to the AI to improve decisions</span>
    </div>

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
import { ref } from 'vue';
import ConstraintBuilder from './ConstraintBuilder.vue';

const OBJECTIVES = [
  { value: 're_engage', label: 'Re-engage', tooltip: 'Bring back inactive users' },
  { value: 'drive_purchase', label: 'Drive Purchase', tooltip: 'Encourage next purchase' },
  { value: 'redeem_points', label: 'Redeem Points', tooltip: 'Get users to spend idle points' },
  { value: 'tier_upgrade', label: 'Tier Upgrade', tooltip: 'Push users toward next tier' },
  { value: 'win_back', label: 'Win Back', tooltip: 'Recover churned users' },
  { value: 'upsell', label: 'Upsell', tooltip: 'Increase basket size' },
];

const TONES = [
  { value: 'urgent', label: 'Urgent', tooltip: 'Time-limited, scarcity messaging' },
  { value: 'friendly', label: 'Friendly', tooltip: 'Warm, conversational' },
  { value: 'exclusive', label: 'Exclusive', tooltip: 'VIP, premium feel' },
  { value: 'celebratory', label: 'Celebratory', tooltip: 'Achievement, reward celebration' },
];

const ALLOWED_ACTIONS = [
  { value: 'award_points', label: 'Award Points' },
  { value: 'award_tickets', label: 'Award Tickets' },
  { value: 'assign_tag', label: 'Assign Tag' },
  { value: 'remove_tag', label: 'Remove Tag' },
  { value: 'assign_persona', label: 'Assign Persona' },
  { value: 'assign_earn_factor', label: 'Assign Earn Factor' },
  { value: 'send_line_message', label: 'Send LINE Message' },
  { value: 'send_sms', label: 'Send SMS' },
  { value: 'submit_form', label: 'Submit Form' },
];

const ALL_ACTION_VALUES = ALLOWED_ACTIONS.map(a => a.value);

const AGENT_VARS = [
  '{{agent.message}}', '{{agent.selected_asset_name}}',
  '{{agent.action}}', '{{agent.urgency}}', '{{agent.reasoning}}',
];

export default {
  name: 'AgentConfig',
  components: { ConstraintBuilder },
  props: {
    config: { type: Object, required: true },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const showVars = ref(false);

    const updateField = (field, value) => {
      emit('update', { ...props.config, [field]: value });
    };

    const isActionAllowed = (actionValue) => {
      const allowed = props.config?.allowed_action_types;
      if (!Array.isArray(allowed)) return true;
      return allowed.includes(actionValue);
    };

    const toggleAction = (actionValue, checked) => {
      const current = Array.isArray(props.config?.allowed_action_types)
        ? [...props.config.allowed_action_types]
        : [...ALL_ACTION_VALUES];

      if (checked && !current.includes(actionValue)) {
        current.push(actionValue);
      } else if (!checked) {
        const idx = current.indexOf(actionValue);
        if (idx !== -1) current.splice(idx, 1);
      }

      const allSelected = ALL_ACTION_VALUES.every(v => current.includes(v));
      emit('update', { ...props.config, allowed_action_types: allSelected ? null : current });
    };

    return {
      OBJECTIVES, TONES, ALLOWED_ACTIONS, AGENT_VARS,
      showVars, updateField, isActionAllowed, toggleAction,
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

.polaris-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-100);

  &__label {
    font-size: var(--p-font-size-300);
    font-weight: var(--p-font-weight-medium);
    color: var(--p-color-text);
    &--required::after { content: ' *'; color: var(--p-color-text-critical); }
  }

  &__input { @include polaris-input; font-size: var(--p-font-size-300); }
  &__select { @include polaris-select; font-size: var(--p-font-size-300); }
  &__textarea { @include polaris-textarea; font-size: var(--p-font-size-300); }
  &__help { @include polaris-help-text; }
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-150);
  padding-top: var(--p-space-100);
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: var(--p-space-200);
  font-size: var(--p-font-size-300);
  color: var(--p-color-text);
  cursor: pointer;
  input { width: 16px; height: 16px; cursor: pointer; }
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
