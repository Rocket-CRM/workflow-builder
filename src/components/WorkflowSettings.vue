<template>
  <div class="wf-settings">
    <!-- ═══ CONSTRAINTS ═══ -->
    <section class="settings-section">
      <h3 class="settings-section__title">Constraints</h3>
      <p class="settings-section__help">Rules that limit how often or how much the workflow can act</p>
      <ConstraintBuilder
        :constraints="localConfig.constraints"
        @update="handleConstraintsUpdate"
      />
    </section>

    <!-- ═══ QUIET HOURS ═══ -->
    <section class="settings-section">
      <h3 class="settings-section__title">Quiet Hours</h3>
      <label class="toggle-row">
        <input type="checkbox" :checked="localConfig.quiet_hours?.enabled" @change="updateQuietHours('enabled', $event.target.checked)" />
        <span>Enable quiet hours</span>
      </label>

      <template v-if="localConfig.quiet_hours?.enabled">
        <div class="time-row">
          <div class="polaris-form-field">
            <label class="polaris-form-field__label">Start</label>
            <input class="polaris-form-field__input" type="time" :value="localConfig.quiet_hours?.start || '22:00'" @input="updateQuietHours('start', $event.target.value)" />
          </div>
          <div class="polaris-form-field">
            <label class="polaris-form-field__label">End</label>
            <input class="polaris-form-field__input" type="time" :value="localConfig.quiet_hours?.end || '08:00'" @input="updateQuietHours('end', $event.target.value)" />
          </div>
          <div class="polaris-form-field">
            <label class="polaris-form-field__label">Timezone</label>
            <select class="polaris-form-field__select" :value="localConfig.quiet_hours?.timezone || 'Asia/Bangkok'" @change="updateQuietHours('timezone', $event.target.value)">
              <option v-for="tz in TIMEZONES" :key="tz" :value="tz">{{ tz }}</option>
            </select>
          </div>
        </div>
      </template>
    </section>

    <!-- ═══ BLACKOUT DATES ═══ -->
    <section class="settings-section">
      <h3 class="settings-section__title">Blackout Dates</h3>
      <p class="settings-section__help">Dates when the AI agent will not execute any actions</p>

      <div class="blackout-tags">
        <span v-for="(date, idx) in (localConfig.blackout_dates || [])" :key="date" class="blackout-tag">
          {{ formatDate(date) }}
          <button class="blackout-tag__remove" @click="removeBlackoutDate(idx)">✕</button>
        </span>
      </div>
      <input class="polaris-form-field__input" type="date" @change="addBlackoutDate($event.target.value); $event.target.value = ''" />
    </section>

    <!-- ═══ CAMPAIGN KPI ═══ -->
    <section class="settings-section">
      <h3 class="settings-section__title">Campaign KPI</h3>

      <div class="polaris-form-field">
        <label class="polaris-form-field__label">Desired Outcome</label>
        <select class="polaris-form-field__select" :value="localConfig.campaign_kpi?.desired_outcome || ''" @change="updateKpi('desired_outcome', $event.target.value)">
          <option value="">None</option>
          <option v-for="o in OUTCOMES" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <div class="kpi-row">
        <div class="polaris-form-field">
          <label class="polaris-form-field__label">Measurement Window</label>
          <div class="input-suffix">
            <input class="polaris-form-field__input" type="number" min="1" :value="localConfig.campaign_kpi?.measurement_window_days ?? 7" @input="updateKpi('measurement_window_days', parseInt($event.target.value) || 7)" />
            <span class="input-suffix__text">days</span>
          </div>
        </div>
        <div class="polaris-form-field">
          <label class="polaris-form-field__label">Target Conversion Rate</label>
          <div class="input-suffix">
            <input class="polaris-form-field__input" type="number" min="0" max="100" step="1" :value="localConfig.campaign_kpi?.target_conversion_rate != null ? Math.round(localConfig.campaign_kpi.target_conversion_rate * 100) : ''" placeholder="—" @input="updateKpi('target_conversion_rate', $event.target.value ? parseFloat($event.target.value) / 100 : null)" />
            <span class="input-suffix__text">%</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { reactive, watch } from 'vue';
import ConstraintBuilder from './ConstraintBuilder.vue';

const TIMEZONES = [
  'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Europe/London', 'Europe/Berlin', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney', 'Pacific/Auckland',
];

const OUTCOMES = [
  { value: 'purchase_completed', label: 'Purchase Completed' },
  { value: 'tier_upgraded', label: 'Tier Upgraded' },
  { value: 'points_redeemed', label: 'Points Redeemed' },
  { value: 'form_submitted', label: 'Form Submitted' },
];

export default {
  name: 'WorkflowSettings',
  components: { ConstraintBuilder },
  props: {
    config: { type: Object, default: () => ({}) },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const localConfig = reactive({
      constraints: [],
      quiet_hours: { enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Bangkok' },
      blackout_dates: [],
      campaign_kpi: { desired_outcome: '', measurement_window_days: 7, target_conversion_rate: null },
    });

    watch(() => props.config, (cfg) => {
      if (!cfg) return;
      localConfig.constraints = Array.isArray(cfg.constraints) ? [...cfg.constraints] : [];
      localConfig.quiet_hours = { enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Bangkok', ...(cfg.quiet_hours || {}) };
      localConfig.blackout_dates = Array.isArray(cfg.blackout_dates) ? [...cfg.blackout_dates] : [];
      localConfig.campaign_kpi = { desired_outcome: '', measurement_window_days: 7, target_conversion_rate: null, ...(cfg.campaign_kpi || {}) };
    }, { immediate: true, deep: true });

    const emitConfig = () => {
      emit('update', JSON.parse(JSON.stringify(localConfig)));
    };

    // Constraints
    const handleConstraintsUpdate = (newConstraints) => {
      localConfig.constraints = newConstraints;
      emitConfig();
    };

    // Quiet Hours
    const updateQuietHours = (field, value) => {
      localConfig.quiet_hours[field] = value;
      emitConfig();
    };

    // Blackout Dates
    const addBlackoutDate = (dateStr) => {
      if (!dateStr) return;
      if (!localConfig.blackout_dates.includes(dateStr)) {
        localConfig.blackout_dates.push(dateStr);
        localConfig.blackout_dates.sort();
        emitConfig();
      }
    };

    const removeBlackoutDate = (idx) => {
      localConfig.blackout_dates.splice(idx, 1);
      emitConfig();
    };

    const formatDate = (iso) => {
      try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
      catch { return iso; }
    };

    // Campaign KPI
    const updateKpi = (field, value) => {
      localConfig.campaign_kpi[field] = value;
      emitConfig();
    };

    return {
      TIMEZONES, OUTCOMES, localConfig,
      handleConstraintsUpdate,
      updateQuietHours,
      addBlackoutDate, removeBlackoutDate, formatDate,
      updateKpi,
    };
  },
};
</script>

<style lang="scss" scoped>
@import 'polaris-weweb-styles';

.wf-settings {
  @include polaris-tokens;
  display: flex;
  flex-direction: column;
  gap: var(--p-space-500);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-300);

  &__title {
    font-size: var(--p-font-size-325);
    font-weight: var(--p-font-weight-semibold);
    color: var(--p-color-text);
    margin: 0;
  }

  &__help {
    font-size: var(--p-font-size-275);
    color: var(--p-color-text-secondary);
    margin: 0;
  }
}

.polaris-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-100);

  &__label { font-size: var(--p-font-size-300); font-weight: var(--p-font-weight-medium); color: var(--p-color-text); }
  &__input { @include polaris-input; font-size: var(--p-font-size-300); }
  &__select { @include polaris-select; font-size: var(--p-font-size-300); }
}

.polaris-btn {
  @include polaris-button-base;
  font-size: var(--p-font-size-300);
  &--plain { @include polaris-button-plain; }
}

// Quiet hours
.toggle-row {
  display: flex;
  align-items: center;
  gap: var(--p-space-200);
  font-size: var(--p-font-size-300);
  color: var(--p-color-text);
  cursor: pointer;
  input { width: 16px; height: 16px; cursor: pointer; }
}

.time-row {
  display: flex;
  gap: var(--p-space-200);
  align-items: flex-end;
  flex-wrap: wrap;

  .polaris-form-field { flex: 1; min-width: 100px; }
}

// Blackout dates
.blackout-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-space-150);
}

.blackout-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--p-space-100);
  padding: 4px 8px;
  background: var(--p-color-bg-surface-secondary);
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-200);
  font-size: var(--p-font-size-275);
  color: var(--p-color-text);

  &__remove {
    border: none;
    background: none;
    color: var(--p-color-text-critical);
    cursor: pointer;
    font-size: 12px;
    padding: 0;
    line-height: 1;
    &:hover { opacity: 0.7; }
  }
}

// KPI
.kpi-row {
  display: flex;
  gap: var(--p-space-200);
  .polaris-form-field { flex: 1; }
}

.input-suffix {
  display: flex;
  align-items: center;
  gap: var(--p-space-100);

  .polaris-form-field__input { flex: 1; }

  &__text {
    font-size: var(--p-font-size-300);
    color: var(--p-color-text-secondary);
    white-space: nowrap;
  }
}
</style>
