<template>
  <div class="user-list-overlay" @click.self="$emit('close')">
    <div class="user-list-panel">
      <!-- Header -->
      <div class="user-list-panel__header">
        <div>
          <h3 class="user-list-panel__title">Users at: {{ nodeName }}</h3>
          <span class="user-list-panel__count">{{ totalCount }} total users</span>
        </div>
        <div class="user-list-panel__actions">
          <PolarisButton @click="handleExport">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h14"/><path d="M10 3v11"/><path d="M6 10l4 4 4-4"/></svg>
            Export
          </PolarisButton>
          <button class="user-list-panel__close" @click="$emit('close')">
            <svg viewBox="0 0 20 20" width="16" height="16"><path d="M11.414 10l4.293-4.293a1 1 0 00-1.414-1.414L10 8.586 5.707 4.293a1 1 0 00-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 101.414 1.414L10 11.414l4.293 4.293a1 1 0 001.414-1.414L11.414 10z" fill="currentColor"/></svg>
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="user-list-panel__body">
        <div v-if="loading" class="user-list-panel__loading">
          <PolarisSpinner size="small" /> Loading...
        </div>

        <table v-else-if="users.length" class="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Entry Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.user_id">
              <td class="user-table__name">{{ user.fullname || '—' }}</td>
              <td>{{ user.email || '—' }}</td>
              <td>{{ user.tel || '—' }}</td>
              <td><span class="status-badge" :class="`status-badge--${user.status}`">{{ user.status }}</span></td>
              <td>{{ formatDate(user.node_entry_date) }}</td>
            </tr>
          </tbody>
        </table>

        <div v-else class="user-list-panel__empty">No users have reached this node yet.</div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="user-list-panel__footer">
        <PolarisButton :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">← Prev</PolarisButton>
        <span class="user-list-panel__page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <PolarisButton :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">Next →</PolarisButton>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue';
import { PolarisButton, PolarisSpinner } from 'polaris-weweb-styles/components';

export default {
  name: 'NodeUserList',
  components: { PolarisButton, PolarisSpinner },
  props: {
    workflowId: { type: String, required: true },
    nodeId: { type: String, required: true },
    nodeName: { type: String, default: 'Node' },
    supabaseUrl: { type: String, required: true },
    supabaseAnonKey: { type: String, default: '' },
    authToken: { type: String, required: true },
  },
  emits: ['close'],
  setup(props) {
    const loading = ref(false);
    const users = ref([]);
    const currentPage = ref(1);
    const totalCount = ref(0);
    const totalPages = ref(0);
    const pageSize = 50;

    const rpc = async (fn, body = {}) => {
      const url = props.supabaseUrl?.replace(/\/+$/, '');
      if (!url || !props.authToken) return null;
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
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

    const fetchUsers = async (page = 1) => {
      loading.value = true;
      try {
        const data = await rpc('bff_get_amp_node_users', {
          p_workflow_id: props.workflowId,
          p_node_id: props.nodeId,
          p_page: page,
          p_page_size: pageSize,
        });
        if (data?.success !== false) {
          users.value = data?.users || [];
          totalCount.value = data?.total_count || 0;
          totalPages.value = data?.total_pages || 0;
          currentPage.value = data?.page || page;
        }
      } catch (err) {
        console.error('[NodeUserList] Fetch failed:', err);
      } finally {
        loading.value = false;
      }
    };

    const goToPage = (page) => {
      if (page < 1 || page > totalPages.value) return;
      fetchUsers(page);
    };

    const formatDate = (iso) => {
      if (!iso) return '—';
      try {
        return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch { return iso; }
    };

    const handleExport = () => {
      const url = props.supabaseUrl?.replace(/\/+$/, '');
      if (!url) return;
      const exportUrl = `${url}/functions/v1/amp-export-node-users?workflow_id=${props.workflowId}&node_id=${props.nodeId}&token=${props.authToken}`;
      const doc = typeof wwLib !== 'undefined' ? wwLib.getFrontWindow() : window;
      doc.open(exportUrl, '_blank');
    };

    onMounted(() => fetchUsers(1));

    return { loading, users, currentPage, totalCount, totalPages, goToPage, formatDate, handleExport };
  },
};
</script>

<style lang="scss" scoped>
@import 'polaris-weweb-styles';

.user-list-overlay {
  @include polaris-tokens;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--p-space-1000);
}

.user-list-panel {
  background: var(--p-color-bg-surface);
  border-radius: var(--p-border-radius-300);
  box-shadow: var(--p-shadow-600);
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-list-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--p-space-400);
  border-bottom: var(--p-border-width-025) solid var(--p-color-border);
  flex-shrink: 0;
}

.user-list-panel__title {
  font-size: var(--p-font-size-350);
  font-weight: var(--p-font-weight-bold);
  color: var(--p-color-text);
  margin: 0;
}

.user-list-panel__count {
  font-size: var(--p-font-size-300);
  color: var(--p-color-text-secondary);
}

.user-list-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--p-space-200);
}

.user-list-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--p-border-radius-200);
  background: transparent;
  color: var(--p-color-text-secondary);
  cursor: pointer;
  &:hover { background: var(--p-color-bg-surface-hover); color: var(--p-color-text); }
}

.user-list-panel__body {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.user-list-panel__loading, .user-list-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--p-space-200);
  padding: var(--p-space-600);
  color: var(--p-color-text-secondary);
  font-size: var(--p-font-size-300);
}


.user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--p-font-size-300);

  th {
    text-align: left;
    padding: var(--p-space-200) var(--p-space-300);
    font-weight: var(--p-font-weight-semibold);
    color: var(--p-color-text-secondary);
    border-bottom: var(--p-border-width-025) solid var(--p-color-border);
    white-space: nowrap;
    position: sticky;
    top: 0;
    background: var(--p-color-bg-surface);
  }

  td {
    padding: var(--p-space-200) var(--p-space-300);
    color: var(--p-color-text);
    border-bottom: var(--p-border-width-025) solid var(--p-color-border-subdued);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  &__name { font-weight: var(--p-font-weight-medium); }

  tbody tr:hover { background: var(--p-color-bg-surface-hover); }
}

.status-badge {
  display: inline-block;
  padding: var(--p-space-050) var(--p-space-200);
  border-radius: var(--p-border-radius-200);
  font-size: var(--p-font-size-200);
  font-weight: var(--p-font-weight-medium);
  text-transform: capitalize;

  &--executed, &--sent { background: var(--p-color-bg-fill-success-secondary); color: var(--p-color-text-success); }
  &--delivered { background: var(--p-color-bg-fill-success-secondary); color: var(--p-color-text-success); }
  &--waiting { background: var(--p-color-bg-fill-info-secondary); color: var(--p-color-text-info); }
  &--failed { background: var(--p-color-bg-fill-critical-secondary); color: var(--p-color-text-critical); }
}

.user-list-panel__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--p-space-300);
  padding: var(--p-space-300);
  border-top: var(--p-border-width-025) solid var(--p-color-border);
  flex-shrink: 0;
}

.user-list-panel__page-info {
  font-size: var(--p-font-size-300);
  color: var(--p-color-text-secondary);
}
</style>
