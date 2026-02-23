<template>
  <div class="action-config">
    <!-- Loading state -->
    <div v-if="optionsLoading" class="loading-state">
      <span class="loading-state__spinner"></span>
      <span class="loading-state__text">Loading options...</span>
    </div>

    <template v-else>
      <!-- Action Type Selector -->
      <PolarisSelect
        label="Action Type"
        required
        :modelValue="config?.action_type || config?.channel || ''"
        @update:modelValue="handleActionTypeChange($event)"
        :options="actionTypeOptions"
        placeholder="Select action..."
      />

      <!-- ═══ AWARD CURRENCY ═══ -->
      <template v-if="config?.action_type === 'award_currency'">
        <div class="polaris-form-field">
          <label class="polaris-form-field__label">Currency</label>
          <div class="segmented-toggle">
            <button
              class="segmented-toggle__btn"
              :class="{ 'segmented-toggle__btn--active': (config?.currency || 'points') === 'points' }"
              @click="updateField('currency', 'points')"
            >Points</button>
            <button
              class="segmented-toggle__btn"
              :class="{ 'segmented-toggle__btn--active': config?.currency === 'ticket' }"
              @click="updateField('currency', 'ticket')"
            >Ticket</button>
          </div>
        </div>

        <PolarisSelect
          v-if="config?.currency === 'ticket'"
          label="Ticket Type"
          required
          :modelValue="config?.ticket_type_id || ''"
          @update:modelValue="updateField('ticket_type_id', $event)"
          :options="ticketTypeOptions"
          placeholder="Select ticket type..."
        />

        <PolarisTextField
          label="Amount"
          required
          type="number"
          :min="1"
          :modelValue="config?.amount || 0"
          @update:modelValue="updateField('amount', parseInt($event) || 0)"
        />

        <PolarisTextField
          label="Description"
          placeholder="e.g. Bonus for {{trigger.event}}"
          :modelValue="config?.description || ''"
          @update:modelValue="updateField('description', $event)"
          helpText="Supports {{variable}} substitution"
        />
      </template>

      <!-- ═══ ASSIGN TAG / REMOVE TAG ═══ -->
      <template v-if="config?.action_type === 'assign_tag' || config?.action_type === 'remove_tag'">
        <PolarisSelect
          label="Tag"
          required
          :modelValue="config?.tag_id || ''"
          @update:modelValue="updateField('tag_id', $event)"
          :options="tagOptions"
          placeholder="Select tag..."
        />
      </template>

      <!-- ═══ ASSIGN PERSONA ═══ -->
      <template v-if="config?.action_type === 'assign_persona'">
        <PolarisSelect
          label="Persona"
          required
          :modelValue="config?.persona_id || ''"
          @update:modelValue="updateField('persona_id', $event)"
          :options="personaOptions"
          placeholder="Select persona..."
        />
      </template>

      <!-- ═══ ASSIGN EARN FACTOR ═══ -->
      <template v-if="config?.action_type === 'assign_earn_factor'">
        <PolarisSelect
          label="Earn Factor"
          required
          :modelValue="config?.earn_factor_id || ''"
          @update:modelValue="updateField('earn_factor_id', $event)"
          :options="earnFactorOptions"
          placeholder="Select earn factor..."
        />

        <PolarisTextField
          label="Duration (days)"
          required
          type="number"
          :min="1"
          :modelValue="config?.window_end_days || 30"
          @update:modelValue="updateField('window_end_days', parseInt($event) || 30)"
          helpText="How many days is this offer valid? Starts from the moment the workflow runs for each user."
        />
      </template>

      <!-- ═══ SUBMIT FORM ═══ -->
      <template v-if="config?.action_type === 'submit_form'">
        <PolarisSelect
          label="Form Template"
          required
          :modelValue="config?.form_id || ''"
          @update:modelValue="handleFormSelect($event)"
          :options="formOptions"
          placeholder="Select form..."
        />

        <!-- Form field loading -->
        <div v-if="formFieldsLoading" class="loading-state loading-state--inline">
          <span class="loading-state__spinner loading-state__spinner--small"></span>
          <span class="loading-state__text">Loading form fields...</span>
        </div>

        <!-- Dynamic Form Fields -->
        <div v-else-if="formFields.length" class="form-fields-section">
          <span class="form-fields-section__label">Field Values</span>
          <div
            v-for="field in formFields"
            :key="field?.id || field?.field_key"
          >
            <!-- Text (with text_format support) -->
            <PolarisTextField
              v-if="field?.field_type === 'text'"
              :label="field?.label || field?.field_key"
              :required="field?.is_required"
              :type="getInputType(field?.text_format)"
              :placeholder="field?.placeholder || ''"
              :modelValue="getFieldValue(field.field_key)"
              @update:modelValue="setFieldValue(field.field_key, $event)"
              :helpText="field?.help_text || undefined"
            />

            <!-- Number -->
            <PolarisTextField
              v-else-if="field?.field_type === 'number'"
              :label="field?.label || field?.field_key"
              :required="field?.is_required"
              type="number"
              :min="field?.min_value"
              :max="field?.max_value"
              :placeholder="field?.placeholder || ''"
              :modelValue="getFieldValue(field.field_key)"
              @update:modelValue="setFieldValue(field.field_key, parseFloat($event) || 0)"
              :helpText="field?.help_text || undefined"
            />

            <!-- Date -->
            <PolarisTextField
              v-else-if="field?.field_type === 'date'"
              :label="field?.label || field?.field_key"
              :required="field?.is_required"
              type="date"
              :modelValue="getFieldValue(field.field_key)"
              @update:modelValue="setFieldValue(field.field_key, $event)"
              :helpText="field?.help_text || undefined"
            />

            <!-- Select -->
            <PolarisSelect
              v-else-if="field?.field_type === 'select'"
              :label="field?.label || field?.field_key"
              :required="field?.is_required"
              :modelValue="getFieldValue(field.field_key)"
              @update:modelValue="setFieldValue(field.field_key, $event)"
              :options="selectFieldOptions(field)"
              :placeholder="field?.placeholder || 'Select...'"
              :helpText="field?.help_text || undefined"
            />

            <!-- Radio -->
            <div v-else-if="field?.field_type === 'radio'" class="polaris-form-field">
              <label class="polaris-form-field__label" :class="{ 'polaris-form-field__label--required': field?.is_required }">
                {{ field?.label || field?.field_key }}
              </label>
              <span v-if="field?.help_text" class="polaris-form-field__help">{{ field.help_text }}</span>
              <div class="radio-group">
                <label
                  v-for="opt in safeOptions(field)"
                  :key="opt?.value"
                  class="radio-option"
                >
                  <input
                    type="radio"
                    :name="`field_${field.field_key}`"
                    :value="opt?.value"
                    :checked="getFieldValue(field.field_key) === opt?.value"
                    @change="setFieldValue(field.field_key, opt?.value)"
                  />
                  <span>{{ opt?.label || opt?.value }}</span>
                </label>
              </div>
            </div>

            <!-- Multiselect (checkboxes) -->
            <div v-else-if="field?.field_type === 'multiselect'" class="polaris-form-field">
              <label class="polaris-form-field__label" :class="{ 'polaris-form-field__label--required': field?.is_required }">
                {{ field?.label || field?.field_key }}
              </label>
              <span v-if="field?.help_text" class="polaris-form-field__help">{{ field.help_text }}</span>
              <div class="multiselect-group">
                <label
                  v-for="opt in safeOptions(field)"
                  :key="opt?.value"
                  class="multiselect-option"
                >
                  <input
                    type="checkbox"
                    :checked="isMultiselectChecked(field.field_key, opt?.value)"
                    @change="toggleMultiselectValue(field.field_key, opt?.value, $event.target.checked)"
                  />
                  <span>{{ opt?.label || opt?.value }}</span>
                </label>
                <span v-if="field?.min_selections || field?.max_selections" class="polaris-form-field__help">
                  {{ field?.min_selections ? `Min ${field.min_selections}` : '' }}{{ field?.min_selections && field?.max_selections ? ', ' : '' }}{{ field?.max_selections ? `Max ${field.max_selections}` : '' }} selections
                </span>
              </div>
            </div>

            <!-- Checkbox / Toggle -->
            <div v-else-if="field?.field_type === 'checkbox'" class="polaris-form-field">
              <label class="toggle-field">
                <input
                  type="checkbox"
                  :checked="getFieldValue(field.field_key) === true"
                  @change="setFieldValue(field.field_key, $event.target.checked)"
                />
                <span>{{ field?.placeholder || 'Enabled' }}</span>
              </label>
            </div>

            <!-- Textarea -->
            <PolarisTextField
              v-else-if="field?.field_type === 'textarea'"
              :label="field?.label || field?.field_key"
              :required="field?.is_required"
              multiline
              :rows="3"
              :placeholder="field?.placeholder || ''"
              :modelValue="getFieldValue(field.field_key)"
              @update:modelValue="setFieldValue(field.field_key, $event)"
              :helpText="field?.help_text || undefined"
            />

            <!-- Fallback -->
            <PolarisTextField
              v-else
              :label="field?.label || field?.field_key"
              :required="field?.is_required"
              :placeholder="field?.placeholder || ''"
              :modelValue="getFieldValue(field.field_key)"
              @update:modelValue="setFieldValue(field.field_key, $event)"
              :helpText="field?.help_text || undefined"
            />
          </div>
        </div>
      </template>

      <!-- ═══ SEND LINE MESSAGE ═══ -->
      <template v-if="activeType === 'send_line'">
        <PolarisTextField
          label="Message Content"
          required
          multiline
          :rows="4"
          placeholder="Hello {{user.firstname}}!"
          :modelValue="config?.content || ''"
          @update:modelValue="updateField('content', $event)"
          helpText="Supports {{variable}} substitution"
        />

        <PolarisTextField
          label="LINE Flex JSON (optional)"
          multiline
          monospace
          :rows="6"
          placeholder='{"type": "flex", ...}'
          :modelValue="jsonContentString"
          @update:modelValue="handleJsonChange($event)"
          :error="jsonError || undefined"
        />
      </template>

      <!-- ═══ SEND SMS ═══ -->
      <template v-if="activeType === 'send_sms'">
        <PolarisTextField
          label="Message"
          required
          multiline
          :rows="3"
          placeholder="Your code is {{trigger.code}}"
          :modelValue="config?.message || ''"
          @update:modelValue="updateField('message', $event)"
          helpText="Supports {{variable}} substitution"
        />
      </template>

      <!-- ═══ API CALL ═══ -->
      <template v-if="config?.action_type === 'api_call'">
        <PolarisInline gap="200" blockAlign="end">
          <div style="width: 120px; flex-shrink: 0;">
            <PolarisSelect
              label="Method"
              required
              :modelValue="config?.method || 'POST'"
              @update:modelValue="updateField('method', $event)"
              :options="methodOptions"
            />
          </div>
          <div style="flex: 1;">
            <PolarisTextField
              label="URL"
              required
              placeholder="https://api.example.com/endpoint"
              :modelValue="config?.url || ''"
              @update:modelValue="updateField('url', $event)"
            />
          </div>
        </PolarisInline>

        <PolarisTextField
          v-if="config?.method !== 'GET'"
          label="Body (JSON)"
          multiline
          monospace
          :rows="5"
          :modelValue="bodyString"
          @update:modelValue="handleBodyChange($event)"
          :error="bodyError || undefined"
        />
      </template>

      <!-- ═══ ADD TO / REMOVE FROM AUDIENCE ═══ -->
      <template v-if="config?.action_type === 'add_to_audience' || config?.action_type === 'remove_from_audience'">
        <PolarisSelect
          label="Audience"
          required
          :modelValue="config?.audience_id || ''"
          @update:modelValue="updateField('audience_id', $event)"
          :options="audienceOptions"
          :placeholder="config?.action_type === 'add_to_audience' ? 'Select audience to add to...' : 'Select audience to remove from...'"
        />
      </template>

      <!-- ═══ VARIABLE REFERENCE ═══ -->
      <div v-if="activeType" class="variable-ref">
        <button class="variable-ref__toggle" @click="showVariables = !showVariables">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path v-if="showVariables" d="M2 4l4 4 4-4"/>
            <path v-else d="M4 2l4 4-4 4"/>
          </svg>
          Available variables
        </button>
        <div v-if="showVariables" class="variable-ref__list">
          <div class="variable-ref__group">
            <span class="variable-ref__group-label">User</span>
            <code v-for="v in VARS_USER" :key="v">{{ v }}</code>
          </div>
          <div class="variable-ref__group">
            <span class="variable-ref__group-label">Trigger</span>
            <code v-for="v in VARS_TRIGGER" :key="v">{{ v }}</code>
          </div>
          <div class="variable-ref__group">
            <span class="variable-ref__group-label">Agent (after AI node)</span>
            <code v-for="v in VARS_AGENT" :key="v">{{ v }}</code>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted } from 'vue';
import {
  PolarisTextField,
  PolarisSelect,
  PolarisButton,
  PolarisInline,
} from 'polaris-weweb-styles/components';

const ACTION_GROUPS = [
  {
    label: 'Loyalty',
    actions: [
      { value: 'award_currency', label: 'Award Currency' },
      { value: 'assign_tag', label: 'Assign Tag' },
      { value: 'remove_tag', label: 'Remove Tag' },
      { value: 'assign_persona', label: 'Assign Persona' },
      { value: 'assign_earn_factor', label: 'Assign Earn Factor' },
      { value: 'submit_form', label: 'Submit Form' },
    ],
  },
  {
    label: 'Messaging',
    actions: [
      { value: 'send_line', label: 'Send LINE Message' },
      { value: 'send_sms', label: 'Send SMS' },
    ],
  },
  {
    label: 'Audience',
    actions: [
      { value: 'add_to_audience', label: 'Add to Audience' },
      { value: 'remove_from_audience', label: 'Remove from Audience' },
    ],
  },
  {
    label: 'Integration',
    actions: [
      { value: 'api_call', label: 'API Call / Webhook' },
    ],
  },
];

const ACTION_DEFAULTS = {
  award_currency: { currency: 'points', amount: 100, description: '' },
  assign_tag: { tag_id: '' },
  remove_tag: { tag_id: '' },
  assign_persona: { persona_id: '' },
  assign_earn_factor: { earn_factor_id: '', window_end_days: 30 },
  submit_form: { form_id: '', field_values: {} },
  send_line: { channel: 'line', content: '', json_content: null },
  send_sms: { channel: 'sms', message: '' },
  api_call: { method: 'POST', url: '', body: null },
  add_to_audience: { audience_id: '' },
  remove_from_audience: { audience_id: '' },
};

const VARS_USER = [
  '{{user.firstname}}', '{{user.lastname}}', '{{user.fullname}}',
  '{{user.email}}', '{{user.tel}}',
  '{{user.points_balance}}', '{{user.tier_id}}', '{{user.persona_id}}',
];
const VARS_TRIGGER = [
  '{{trigger.amount}}', '{{trigger.source}}', '{{trigger.transaction_type}}',
];
const VARS_AGENT = [
  '{{agent.message}}', '{{agent.selected_asset_name}}',
  '{{agent.action}}', '{{agent.urgency}}',
];

const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
];

export default {
  name: 'ActionConfig',
  components: {
    PolarisTextField,
    PolarisSelect,
    PolarisButton,
    PolarisInline,
  },
  props: {
    config: { type: Object, required: true },
    audiences: { type: Array, default: () => [] },
    supabaseUrl: { type: String, default: '' },
    supabaseAnonKey: { type: String, default: '' },
    authToken: { type: String, default: '' },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const jsonError = ref('');
    const bodyError = ref('');
    const showVariables = ref(false);

    const optionsLoading = ref(false);
    const ticketTypes = ref([]);
    const tags = ref([]);
    const personaGroups = ref([]);
    const privateEarnFactors = ref([]);
    const forms = ref([]);

    const formFieldsLoading = ref(false);
    const formFields = ref([]);

    const activeType = computed(() => props.config?.action_type || props.config?.channel || '');

    // Flatten ACTION_GROUPS into flat options with optgroup-style labels
    const actionTypeOptions = computed(() => {
      const opts = [];
      for (const group of ACTION_GROUPS) {
        for (const action of group.actions) {
          opts.push({ value: action.value, label: `${group.label} — ${action.label}` });
        }
      }
      return opts;
    });

    const ticketTypeOptions = computed(() => {
      return ticketTypes.value.map(t => ({
        value: t?.id,
        label: t?.description ? `${t?.name} — ${t.description}` : t?.name,
      }));
    });

    const tagOptions = computed(() => {
      return tags.value.map(tag => ({
        value: tag?.id,
        label: tag?.tag_name,
      }));
    });

    const personaOptions = computed(() => {
      const opts = [];
      for (const group of personaGroups.value) {
        for (const p of (group?.personas || [])) {
          opts.push({ value: p?.id, label: `${group?.group_name || 'Ungrouped'} — ${p?.persona_name}` });
        }
      }
      return opts;
    });

    const earnFactorGroups = computed(() => {
      const factors = privateEarnFactors.value || [];
      const groupMap = {};
      factors.forEach(ef => {
        const gName = ef?.group_name || 'Ungrouped';
        if (!groupMap[gName]) groupMap[gName] = { groupName: gName, factors: [] };

        let label = '';
        if (ef?.earn_factor_type === 'rate') {
          label = `Earn ${ef.earn_factor_amount} ${ef.target_currency} per unit`;
        } else if (ef?.earn_factor_type === 'multiplier') {
          label = `${ef.earn_factor_amount}x ${ef.target_currency} multiplier`;
        } else {
          label = `${ef.earn_factor_type} — ${ef.earn_factor_amount} ${ef.target_currency}`;
        }

        if (ef?.target_currency === 'ticket' && ef?.target_entity_id) {
          const ticket = ticketTypes.value.find(t => t?.id === ef.target_entity_id);
          if (ticket?.name) label += ` — ${ticket.name}`;
        }

        groupMap[gName].factors.push({ id: ef.id, displayLabel: label });
      });
      return Object.values(groupMap);
    });

    const earnFactorOptions = computed(() => {
      const opts = [];
      for (const group of earnFactorGroups.value) {
        for (const ef of group.factors) {
          opts.push({ value: ef.id, label: `${group.groupName} — ${ef.displayLabel}` });
        }
      }
      return opts;
    });

    const formOptions = computed(() => {
      return forms.value.map(f => ({
        value: f?.id,
        label: f?.form_category ? `${f?.name} (${f.form_category})` : f?.name,
      }));
    });

    const audienceOptions = computed(() => {
      const items = Array.isArray(props.audiences) ? props.audiences : [];
      return items.filter(a => a?.is_active !== false).map(a => ({
        value: a?.id,
        label: a?.member_count != null
          ? `${a?.name || 'Untitled'} (${Number(a.member_count).toLocaleString()} members)`
          : a?.name || 'Untitled',
      }));
    });

    const jsonContentString = computed(() => {
      const c = props.config?.json_content;
      if (!c) return '';
      return typeof c === 'object' ? JSON.stringify(c, null, 2) : c;
    });

    const bodyString = computed(() => {
      const b = props.config?.body;
      if (!b) return '';
      return typeof b === 'object' ? JSON.stringify(b, null, 2) : b;
    });

    // ─── Supabase RPC helpers ────────────────────────────────────

    const rpc = async (functionName, body = {}) => {
      const url = props.supabaseUrl?.replace(/\/+$/, '');
      if (!url || !props.authToken) return null;

      const res = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${props.authToken}`,
          'apikey': props.supabaseAnonKey || props.authToken,
        },
        body: JSON.stringify(body),
      });
      return res.json();
    };

    const fetchActionOptions = async () => {
      if (!props.supabaseUrl || !props.authToken) return;
      optionsLoading.value = true;
      try {
        const data = await rpc('bff_get_amp_action_options');
        if (data?.success !== false) {
          ticketTypes.value = data?.ticket_types || [];
          tags.value = data?.tags || [];
          personaGroups.value = data?.persona_groups || [];
          privateEarnFactors.value = data?.private_earn_factors || [];
          forms.value = data?.forms || [];
        }
      } catch (err) {
        console.error('[ActionConfig] Failed to fetch options:', err);
      } finally {
        optionsLoading.value = false;
      }
    };

    const fetchFormFields = async (formId) => {
      if (!formId || !props.supabaseUrl) return;
      formFieldsLoading.value = true;
      formFields.value = [];
      try {
        const data = await rpc('bff_get_amp_form_fields', { p_form_id: formId });
        if (data?.success !== false) {
          formFields.value = data?.fields || [];
        }
      } catch (err) {
        console.error('[ActionConfig] Failed to fetch form fields:', err);
      } finally {
        formFieldsLoading.value = false;
      }
    };

    onMounted(async () => {
      await fetchActionOptions();
      if (props.config?.action_type === 'submit_form' && props.config?.form_id) {
        await fetchFormFields(props.config.form_id);
      }
    });

    // ─── Field update helpers ────────────────────────────────────

    const updateField = (field, value) => {
      emit('update', { ...props.config, [field]: value });
    };

    const handleActionTypeChange = (actionType) => {
      const defaults = ACTION_DEFAULTS[actionType] || {};
      emit('update', {
        label: props.config?.label || 'Action',
        action_type: actionType,
        ...defaults,
      });
    };

    const handleFormSelect = async (formId) => {
      emit('update', { ...props.config, form_id: formId, field_values: {} });
      await fetchFormFields(formId);
    };

    const getFieldValue = (fieldKey) => props.config?.field_values?.[fieldKey] ?? '';

    const setFieldValue = (fieldKey, value) => {
      const fieldValues = { ...(props.config?.field_values || {}), [fieldKey]: value };
      emit('update', { ...props.config, field_values: fieldValues });
    };

    const safeOptions = (field) => {
      const opts = field?.options;
      if (Array.isArray(opts)) return opts;
      if (typeof opts === 'string') {
        try { return JSON.parse(opts); } catch { return []; }
      }
      return [];
    };

    const selectFieldOptions = (field) => {
      const opts = safeOptions(field);
      return [
        { value: '', label: field?.placeholder || 'Select...' },
        ...opts.map(opt => ({ value: opt?.value, label: opt?.label || opt?.value })),
      ];
    };

    const getInputType = (textFormat) => {
      const map = { email: 'email', phone: 'tel', url: 'url' };
      return map[textFormat] || 'text';
    };

    const isMultiselectChecked = (fieldKey, optValue) => {
      const current = props.config?.field_values?.[fieldKey];
      return Array.isArray(current) && current.includes(optValue);
    };

    const toggleMultiselectValue = (fieldKey, optValue, checked) => {
      const current = Array.isArray(props.config?.field_values?.[fieldKey])
        ? [...props.config.field_values[fieldKey]]
        : [];
      if (checked && !current.includes(optValue)) current.push(optValue);
      else if (!checked) {
        const idx = current.indexOf(optValue);
        if (idx !== -1) current.splice(idx, 1);
      }
      setFieldValue(fieldKey, current);
    };

    const handleJsonChange = (value) => {
      if (!value) { emit('update', { ...props.config, json_content: null }); jsonError.value = ''; return; }
      try { emit('update', { ...props.config, json_content: JSON.parse(value) }); jsonError.value = ''; }
      catch (e) { emit('update', { ...props.config, json_content: value }); jsonError.value = 'Invalid JSON: ' + e.message; }
    };

    const handleBodyChange = (value) => {
      if (!value) { emit('update', { ...props.config, body: null }); bodyError.value = ''; return; }
      try { emit('update', { ...props.config, body: JSON.parse(value) }); bodyError.value = ''; }
      catch (e) { emit('update', { ...props.config, body: value }); bodyError.value = 'Invalid JSON: ' + e.message; }
    };

    return {
      ACTION_GROUPS,
      VARS_USER,
      VARS_TRIGGER,
      VARS_AGENT,
      methodOptions,
      optionsLoading,
      ticketTypes,
      tags,
      personaGroups,
      privateEarnFactors,
      earnFactorGroups,
      earnFactorOptions,
      forms,
      formFieldsLoading,
      formFields,
      activeType,
      actionTypeOptions,
      ticketTypeOptions,
      tagOptions,
      personaOptions,
      formOptions,
      audienceOptions,
      jsonContentString,
      jsonError,
      bodyString,
      bodyError,
      showVariables,
      updateField,
      handleActionTypeChange,
      handleFormSelect,
      getFieldValue,
      setFieldValue,
      safeOptions,
      selectFieldOptions,
      getInputType,
      isMultiselectChecked,
      toggleMultiselectValue,
      handleJsonChange,
      handleBodyChange,
    };
  },
};
</script>

<style lang="scss" scoped>
@import 'polaris-weweb-styles';

.action-config {
  @include polaris-tokens;
  display: flex;
  flex-direction: column;
  gap: var(--p-space-400);
}

// Custom patterns kept as-is
.polaris-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-100);

  &__label {
    @include polaris-label;
    &--required::after { content: ' *'; color: var(--p-color-text-critical); }
  }

  &__help { @include polaris-help-text; }
}

.segmented-toggle {
  display: flex;
  border-radius: var(--p-border-radius-200);
  overflow: hidden;
  border: 1px solid var(--p-color-border);

  &__btn {
    flex: 1;
    padding: var(--p-space-150) var(--p-space-300);
    border: none;
    background: var(--p-color-bg-surface);
    color: var(--p-color-text);
    font-size: var(--p-font-size-300);
    font-weight: var(--p-font-weight-medium);
    cursor: pointer;
    transition: all 0.1s ease;

    & + & { border-left: 1px solid var(--p-color-border); }

    &--active {
      background: var(--p-color-bg-surface-selected);
      color: var(--p-color-text-brand);
      font-weight: var(--p-font-weight-semibold);
    }

    &:hover:not(&--active) { background: var(--p-color-bg-surface-hover); }
  }
}

.form-fields-section {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-300);
  padding: var(--p-space-300);
  background: var(--p-color-bg-surface-secondary);
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-200);

  &__label {
    font-size: var(--p-font-size-300);
    font-weight: var(--p-font-weight-medium);
    color: var(--p-color-text);
  }
}

.radio-group, .multiselect-group {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-150);
}

.radio-option, .multiselect-option {
  display: flex;
  align-items: center;
  gap: var(--p-space-200);
  font-size: var(--p-font-size-300);
  color: var(--p-color-text);
  cursor: pointer;

  input { width: 16px; height: 16px; cursor: pointer; }
}

.toggle-field {
  display: flex;
  align-items: center;
  gap: var(--p-space-200);
  font-size: var(--p-font-size-300);
  color: var(--p-color-text);
  cursor: pointer;

  input { width: 16px; height: 16px; cursor: pointer; }
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--p-space-200);
  padding: var(--p-space-500);
  color: var(--p-color-text-secondary);

  &--inline {
    justify-content: flex-start;
    padding: var(--p-space-300) 0;
  }

  &__text { font-size: var(--p-font-size-300); }

  &__spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--p-color-border);
    border-top-color: var(--p-color-text-brand);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;

    &--small { width: 14px; height: 14px; }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.variable-ref {
  border-top: 1px solid var(--p-color-border);
  padding-top: var(--p-space-300);
  margin-top: var(--p-space-200);
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

  svg { transition: transform 0.15s ease; }
}

.variable-ref__list {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-300);
  padding-top: var(--p-space-200);
}

.variable-ref__group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-space-100);
  align-items: center;
}

.variable-ref__group-label {
  font-size: var(--p-font-size-275);
  font-weight: var(--p-font-weight-semibold);
  color: var(--p-color-text-secondary);
  width: 100%;
  margin-bottom: 2px;
}

.variable-ref code {
  background: var(--p-color-bg-surface-secondary);
  padding: 2px 6px;
  border-radius: var(--p-border-radius-100);
  font-family: var(--p-font-family-mono);
  font-size: 11px;
  color: var(--p-color-text);
  white-space: nowrap;
  cursor: pointer;

  &:hover { background: var(--p-color-bg-surface-hover); }
}
</style>
