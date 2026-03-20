<template>
  <div class="trigger-config">
    <!-- Entry type toggle -->
    <PolarisCard>
      <PolarisCardSection>
    <div class="entry-type-selector">
      <span class="entry-type-selector__label">Entry type</span>
      <div class="entry-type-options">
        <label class="entry-type-option" :class="{ 'entry-type-option--active': entryType === 'audience' }">
          <input type="radio" value="audience" :checked="entryType === 'audience'" @change="switchEntryType('audience')" />
          <div class="entry-type-option__content">
            <span class="entry-type-option__icon"><img :src="ICON_URLS.audience" class="entry-type-icon-img" /></span>
            <div>
              <span class="entry-type-option__title">Audience</span>
              <span class="entry-type-option__desc">Users who enter a specific audience</span>
            </div>
          </div>
        </label>
        <label class="entry-type-option" :class="{ 'entry-type-option--active': entryType === 'condition' }">
          <input type="radio" value="condition" :checked="entryType === 'condition'" @change="switchEntryType('condition')" />
          <div class="entry-type-option__content">
            <span class="entry-type-option__icon"><img :src="ICON_URLS.custom_condition" class="entry-type-icon-img" /></span>
            <div>
              <span class="entry-type-option__title">Custom condition</span>
              <span class="entry-type-option__desc">Users who match specific criteria</span>
            </div>
          </div>
        </label>
      </div>
    </div>
      </PolarisCardSection>
    </PolarisCard>

    <!-- Audience mode -->
    <PolarisCard v-if="entryType === 'audience'">
      <PolarisCardSection>
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

      <PolarisBanner v-if="activeAudiences.length === 0" variant="info">
        No active audiences found. Create an audience first, then come back to set up this trigger.
      </PolarisBanner>
      </PolarisCardSection>
    </PolarisCard>

    <!-- Custom condition mode -->
    <ConditionConfig
      v-if="entryType === 'condition'"
      :config="conditionConfig"
      :collections="collections"
      @update="handleConditionUpdate"
    />
  </div>
</template>

<script>
import { computed } from 'vue';
import ConditionConfig from './ConditionConfig.vue';
import {
  PolarisSelect,
  PolarisBanner,
  PolarisCard,
  PolarisCardSection,
} from 'polaris-weweb-styles/components';

const ICON_BASE = 'https://wkevmsedchftztoolkmi.supabase.co/storage/v1/object/public/default%20images';
const ICON_URLS = {
  audience: `${ICON_BASE}/icon_Audience.svg`,
  custom_condition: `${ICON_BASE}/icon_Custom Condition.svg`,
};

export default {
  name: 'TriggerConfig',
  components: { ConditionConfig, PolarisSelect, PolarisBanner, PolarisCard, PolarisCardSection },
  props: {
    config: { type: Object, required: true },
    collections: { type: Array, default: () => [] },
    audiences: { type: Array, default: () => [] },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const entryType = computed(() => props.config?.entry_type || 'condition');

    const activeAudiences = computed(() => {
      return (props.audiences || []).filter(a => a?.is_active === true);
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
      return (props.audiences || []).find(a => a?.id === id) || null;
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
      ICON_URLS,
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

  &:hover { background: var(--p-color-bg-surface-hover); }

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
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    .entry-type-icon-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
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
</style>
