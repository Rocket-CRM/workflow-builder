<template>
  <div class="trigger-config">
    <!-- Entry type toggle -->
    <div class="entry-type-selector">
      <span class="entry-type-selector__label">Entry type</span>
      <div class="entry-type-options">
        <label class="entry-type-option" :class="{ 'entry-type-option--active': entryType === 'audience' }">
          <input type="radio" value="audience" :checked="entryType === 'audience'" @change="switchEntryType('audience')" />
          <div class="entry-type-option__content">
            <span class="entry-type-option__icon">👥</span>
            <div>
              <span class="entry-type-option__title">Audience</span>
              <span class="entry-type-option__desc">Users who enter a specific audience</span>
            </div>
          </div>
        </label>
        <label class="entry-type-option" :class="{ 'entry-type-option--active': entryType === 'condition' }">
          <input type="radio" value="condition" :checked="entryType === 'condition'" @change="switchEntryType('condition')" />
          <div class="entry-type-option__content">
            <span class="entry-type-option__icon">🔀</span>
            <div>
              <span class="entry-type-option__title">Custom condition</span>
              <span class="entry-type-option__desc">Users who match specific criteria</span>
            </div>
          </div>
        </label>
      </div>
    </div>

    <!-- Audience mode -->
    <template v-if="entryType === 'audience'">
      <div v-if="audiencesLoading" class="loading-state">
        <span class="loading-state__spinner"></span>
        <span class="loading-state__text">Loading audiences...</span>
      </div>

      <template v-else>
        <PolarisSelect
          label="Select audience"
          required
          :modelValue="config?.audience_id || ''"
          @update:modelValue="selectAudience($event)"
          :options="audienceOptions"
          placeholder="Choose an audience..."
        />

        <div v-if="selectedAudienceInfo" class="audience-info">
          <span class="audience-info__name">{{ selectedAudienceInfo.name }}</span>
          <span v-if="selectedAudienceInfo.description" class="audience-info__desc">{{ selectedAudienceInfo.description }}</span>
          <span class="audience-info__count">{{ formatCount(selectedAudienceInfo.member_count) }} members</span>
        </div>

        <PolarisBanner v-if="activeAudiences.length === 0 && !audiencesLoading" variant="info">
          No active audiences found. Create an audience first, then come back to set up this trigger.
        </PolarisBanner>
      </template>
    </template>

    <!-- Custom condition mode -->
    <template v-if="entryType === 'condition'">
      <ConditionConfig
        :config="conditionConfig"
        :collections="collections"
        @update="handleConditionUpdate"
      />
    </template>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted } from 'vue';
import ConditionConfig from './ConditionConfig.vue';
import {
  PolarisSelect,
  PolarisBanner,
} from 'polaris-weweb-styles/components';

export default {
  name: 'TriggerConfig',
  components: { ConditionConfig, PolarisSelect, PolarisBanner },
  props: {
    config: { type: Object, required: true },
    collections: { type: Array, default: () => [] },
    supabaseUrl: { type: String, default: '' },
    supabaseAnonKey: { type: String, default: '' },
    authToken: { type: String, default: '' },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const audiencesLoading = ref(false);
    const audiences = ref([]);

    const entryType = computed(() => props.config?.entry_type || 'condition');

    const activeAudiences = computed(() => {
      return (audiences.value || []).filter(a => a?.is_active === true);
    });

    const audienceOptions = computed(() => {
      return activeAudiences.value.map(a => ({
        value: a?.id,
        label: `${a?.name || 'Untitled'}${a?.member_count != null ? ` (${formatCount(a.member_count)} members)` : ''}`,
      }));
    });

    const selectedAudienceInfo = computed(() => {
      const id = props.config?.audience_id;
      if (!id) return null;
      return audiences.value.find(a => a?.id === id) || null;
    });

    const conditionConfig = computed(() => {
      if (props.config?.entry_type === 'condition') {
        return {
          match: props.config?.match || 'all',
          groups: props.config?.groups || [],
        };
      }
      return { match: 'all', groups: [] };
    });

    const formatCount = (n) => {
      if (n == null) return '0';
      return Number(n).toLocaleString();
    };

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

    const fetchAudiences = async () => {
      if (!props.supabaseUrl || !props.authToken) return;
      audiencesLoading.value = true;
      try {
        const data = await rpc('bff_list_audiences');
        if (Array.isArray(data)) {
          audiences.value = data;
        } else if (data?.audiences) {
          audiences.value = data.audiences;
        }
      } catch (err) {
        console.error('[TriggerConfig] Failed to fetch audiences:', err);
      } finally {
        audiencesLoading.value = false;
      }
    };

    onMounted(() => {
      fetchAudiences();
    });

    const switchEntryType = (type) => {
      if (type === 'audience') {
        emit('update', {
          ...props.config,
          entry_type: 'audience',
          audience_id: props.config?.audience_id || '',
          groups: undefined,
          match: undefined,
        });
      } else {
        emit('update', {
          ...props.config,
          entry_type: 'condition',
          audience_id: undefined,
          match: props.config?.match || 'all',
          groups: props.config?.groups || [],
        });
      }
    };

    const selectAudience = (audienceId) => {
      emit('update', {
        ...props.config,
        entry_type: 'audience',
        audience_id: audienceId,
      });
    };

    const handleConditionUpdate = (conditionData) => {
      emit('update', {
        ...props.config,
        entry_type: 'condition',
        ...conditionData,
      });
    };

    return {
      audiencesLoading,
      audiences,
      entryType,
      activeAudiences,
      audienceOptions,
      selectedAudienceInfo,
      conditionConfig,
      formatCount,
      switchEntryType,
      selectAudience,
      handleConditionUpdate,
    };
  },
};
</script>

<style lang="scss" scoped>
@import 'polaris-weweb-styles';

.trigger-config {
  @include polaris-tokens;
  display: flex;
  flex-direction: column;
  gap: var(--p-space-400);
}

.entry-type-selector {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-200);

  &__label {
    font-size: var(--p-font-size-300);
    font-weight: var(--p-font-weight-semibold);
    color: var(--p-color-text);
  }
}

.entry-type-options {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-150);
}

.entry-type-option {
  display: flex;
  align-items: flex-start;
  gap: var(--p-space-200);
  padding: var(--p-space-300);
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-200);
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--p-color-bg-surface);

  input[type="radio"] {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    cursor: pointer;
    flex-shrink: 0;
  }

  &:hover {
    background: var(--p-color-bg-surface-hover);
  }

  &--active {
    border-color: var(--p-color-border-brand);
    background: var(--p-color-bg-surface-selected);
  }

  &__content {
    display: flex;
    align-items: flex-start;
    gap: var(--p-space-200);
    flex: 1;
  }

  &__icon {
    font-size: 18px;
    flex-shrink: 0;
    line-height: 1.2;
  }

  &__title {
    display: block;
    font-size: var(--p-font-size-300);
    font-weight: var(--p-font-weight-medium);
    color: var(--p-color-text);
  }

  &__desc {
    display: block;
    font-size: var(--p-font-size-275);
    color: var(--p-color-text-secondary);
    margin-top: 1px;
  }
}

.audience-info {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-100);
  padding: var(--p-space-300);
  background: var(--p-color-bg-surface-secondary);
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-200);

  &__name {
    font-size: var(--p-font-size-300);
    font-weight: var(--p-font-weight-semibold);
    color: var(--p-color-text);
  }

  &__desc {
    font-size: var(--p-font-size-275);
    color: var(--p-color-text-secondary);
  }

  &__count {
    font-size: var(--p-font-size-275);
    color: var(--p-color-text-brand);
    font-weight: var(--p-font-weight-medium);
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

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
