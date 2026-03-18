<template>
  <div class="workflow-list">
    <!-- Header -->
    <div class="workflow-list__header">
      <div>
        <h2 class="workflow-list__title">Workflows</h2>
        <span class="workflow-list__count" v-if="!loading">{{ safeWorkflows.length }} workflow{{ safeWorkflows.length !== 1 ? 's' : '' }}</span>
      </div>
      <PolarisButton variant="primary" @click="$emit('create')">Create Workflow</PolarisButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="workflow-list__loading">
      <span class="spinner"></span>
      <span>Loading workflows...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="safeWorkflows.length === 0" class="workflow-list__empty">
      <div class="empty-state">
        <span class="empty-state__icon">🔀</span>
        <h3 class="empty-state__title">No workflows yet</h3>
        <p class="empty-state__desc">Create your first workflow to automate user journeys</p>
        <PolarisButton variant="primary" @click="$emit('create')">Create Workflow</PolarisButton>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="workflow-list__table-wrap">
      <table class="wf-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Entry</th>
            <th>Nodes</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="wf in safeWorkflows"
            :key="wf?.id"
            class="wf-table__row"
            @click="$emit('select', wf)"
          >
            <td class="wf-table__name">
              <span class="wf-table__name-text">{{ wf?.name || 'Untitled' }}</span>
              <span v-if="wf?.description" class="wf-table__desc">{{ wf.description }}</span>
            </td>
            <td>
              <span class="wf-entry-badge" :class="wf?.trigger_type ? `wf-entry-badge--${wf.trigger_type}` : ''">
                {{ formatTriggerType(wf?.trigger_type) }}
              </span>
            </td>
            <td class="wf-table__center">{{ wf?.node_count ?? '—' }}</td>
            <td>
              <label class="status-toggle" @click.stop>
                <input
                  type="checkbox"
                  :checked="wf?.is_active === true"
                  @change="$emit('toggle-status', wf, $event.target.checked)"
                />
                <span class="status-toggle__slider"></span>
                <span class="status-toggle__label">{{ wf?.is_active ? 'Live' : 'Draft' }}</span>
              </label>
            </td>
            <td class="wf-table__date">{{ formatDate(wf?.updated_at || wf?.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { PolarisButton } from 'polaris-weweb-styles/components';

export default {
  name: 'WorkflowList',
  components: { PolarisButton },
  props: {
    workflows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  emits: ['select', 'create', 'toggle-status'],
  setup(props) {
    const safeWorkflows = computed(() => {
      const list = Array.isArray(props.workflows) ? props.workflows : [];
      return list.filter(w => !w?.scope || w?.scope === 'user');
    });

    const formatDate = (iso) => {
      if (!iso) return '—';
      try {
        return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch { return iso; }
    };

    const formatTriggerType = (type) => {
      if (!type) return 'Not set';
      const map = {
        audience_entered: 'Audience',
        wallet_ledger: 'Transaction',
        purchase_ledger: 'Purchase',
        user_accounts: 'User update',
      };
      return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return { safeWorkflows, formatDate, formatTriggerType };
  },
};
</script>

<style lang="scss" scoped>
@import 'polaris-weweb-styles';

.workflow-list {
  @include polaris-tokens;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
  font-family: var(--p-font-family-sans);
  padding: 0 var(--p-space-500);
}

.workflow-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--p-space-500) 0;
  flex-shrink: 0;
}

.workflow-list__title {
  font-size: var(--p-font-size-500);
  font-weight: var(--p-font-weight-bold);
  color: var(--p-color-text);
  margin: 0;
}

.workflow-list__count {
  font-size: var(--p-font-size-275);
  color: var(--p-color-text-secondary);
}

.workflow-list__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--p-space-200);
  padding: var(--p-space-800);
  color: var(--p-color-text-secondary);
  font-size: var(--p-font-size-300);
  background: var(--p-color-bg-surface);
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-300);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--p-color-border);
  border-top-color: var(--p-color-text-brand);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.workflow-list__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-color-bg-surface);
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-300);
}

.empty-state {
  text-align: center;
  padding: var(--p-space-800);

  &__icon { font-size: 48px; display: block; margin-bottom: var(--p-space-300); }

  &__title {
    font-size: var(--p-font-size-400);
    font-weight: var(--p-font-weight-semibold);
    color: var(--p-color-text);
    margin: 0 0 var(--p-space-100);
  }

  &__desc {
    font-size: var(--p-font-size-300);
    color: var(--p-color-text-secondary);
    margin: 0 0 var(--p-space-400);
  }
}

.workflow-list__table-wrap {
  flex: 1;
  overflow-y: auto;
  background: var(--p-color-bg-surface);
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-300);
}

.wf-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--p-font-size-300);

  th {
    text-align: left;
    padding: var(--p-space-200) var(--p-space-400);
    font-weight: var(--p-font-weight-semibold);
    font-size: var(--p-font-size-275);
    color: var(--p-color-text-secondary);
    border-bottom: 1px solid var(--p-color-border);
    white-space: nowrap;
    position: sticky;
    top: 0;
    background: var(--p-color-bg-surface-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &:first-child { border-top-left-radius: var(--p-border-radius-300); }
    &:last-child { border-top-right-radius: var(--p-border-radius-300); }
  }

  td {
    padding: var(--p-space-300) var(--p-space-400);
    color: var(--p-color-text);
    border-bottom: 1px solid var(--p-color-border-subdued);
    vertical-align: middle;
  }

  tbody tr:last-child td { border-bottom: none; }

  &__row {
    cursor: pointer;
    transition: background 0.1s;
    &:hover { background: var(--p-color-bg-surface-hover); }
  }

  &__name {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name-text {
    font-weight: var(--p-font-weight-semibold);
    color: var(--p-color-text);
  }

  &__desc {
    font-size: var(--p-font-size-275);
    color: var(--p-color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 280px;
  }

  &__center { text-align: center; }

  &__date {
    white-space: nowrap;
    color: var(--p-color-text-secondary);
    font-size: var(--p-font-size-275);
  }
}

.wf-entry-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--p-border-radius-100);
  font-size: var(--p-font-size-275);
  font-weight: var(--p-font-weight-medium);
  background: var(--p-color-bg-fill-secondary);
  color: var(--p-color-text-secondary);

  &--audience_entered { background: #EDE9FE; color: #6D28D9; }
  &--wallet_ledger { background: #DBEAFE; color: #1D4ED8; }
  &--purchase_ledger { background: #D1FAE5; color: #065F46; }
  &--user_accounts { background: #FEF3C7; color: #92400E; }
}

.status-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--p-space-150);
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  &__slider {
    width: 36px;
    height: 20px;
    background: var(--p-color-bg-fill-disabled);
    border-radius: 10px;
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;

    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 2px rgba(0,0,0,0.15);
    }
  }

  input:checked + &__slider {
    background: var(--p-color-bg-fill-success);

    &::after { transform: translateX(16px); }
  }

  &__label {
    font-size: var(--p-font-size-275);
    color: var(--p-color-text-secondary);
    font-weight: var(--p-font-weight-medium);
  }
}
</style>
