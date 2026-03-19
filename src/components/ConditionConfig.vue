<template>
  <PolarisCard>
    <PolarisCardSection>
      <!-- Header -->
      <PolarisInline gap="200" blockAlign="center" align="space-between">
        <PolarisText variant="headingSm">Condition Builder</PolarisText>
        <PolarisButtonGroup segmented>
          <PolarisButton
            :pressed="config?.match === 'all'"
            @click="emitUpdate({ ...config, match: 'all' })"
            size="slim"
          >All (AND)</PolarisButton>
          <PolarisButton
            :pressed="config?.match === 'any'"
            @click="emitUpdate({ ...config, match: 'any' })"
            size="slim"
          >Any (OR)</PolarisButton>
        </PolarisButtonGroup>
      </PolarisInline>

      <!-- Groups -->
      <div class="polaris-condition-list" v-if="config?.groups?.length">
        <div
          v-for="(group, gIdx) in config.groups"
          :key="group?.id || gIdx"
          class="cond-group"
        >
          <div class="cond-group__header">
            <div class="cond-group__header-left">
              <PolarisText variant="bodyMd">Group {{ gIdx + 1 }}</PolarisText>
            </div>
            <div class="cond-group__header-right">
              <PolarisButtonGroup segmented>
                <PolarisButton
                  :pressed="group?.operator === 'AND'"
                  @click="updateGroupOperator(group.id, 'AND')"
                  size="slim"
                >AND</PolarisButton>
                <PolarisButton
                  :pressed="group?.operator === 'OR'"
                  @click="updateGroupOperator(group.id, 'OR')"
                  size="slim"
                >OR</PolarisButton>
              </PolarisButtonGroup>
              <PolarisButton variant="plain" icon="close" iconOnly @click="removeGroup(group.id)" />
            </div>
          </div>

          <div class="cond-group__body">
            <!-- Collection select -->
            <PolarisSelect
              label="Collection"
              :modelValue="group?.collection || ''"
              @update:modelValue="updateGroupCollection(group.id, $event)"
              :options="collectionOptions"
              placeholder="Select collection..."
            />

            <!-- Mode toggle (only if collection supports aggregate) -->
            <div v-if="collectionSupportsAggregate(group?.collection)" class="condition-mode-toggle">
              <PolarisButtonGroup segmented>
                <PolarisButton
                  :pressed="getGroupType(group) === 'simple'"
                  @click="updateGroupType(group.id, 'simple')"
                >Check single record</PolarisButton>
                <PolarisButton
                  :pressed="getGroupType(group) === 'aggregate'"
                  @click="updateGroupType(group.id, 'aggregate')"
                >Check aggregate</PolarisButton>
              </PolarisButtonGroup>
            </div>

            <!-- ═══ SIMPLE MODE ═══ -->
            <template v-if="getGroupType(group) === 'simple'">
              <div class="polaris-condition-list">
                <template v-for="(condition, cIdx) in (group?.conditions || [])" :key="condition?.id || cIdx">
                  <div class="polaris-condition-item">
                    <div v-if="cIdx > 0" class="polaris-condition-operator">
                      <PolarisText variant="bodyMd">{{ group?.operator || 'AND' }}</PolarisText>
                    </div>

                    <div class="polaris-condition-fields">
                      <div class="cond-field cond-field--grow">
                        <PolarisSelect
                          label="Field"
                          size="small"
                          :modelValue="condition?.field || ''"
                          @update:modelValue="updateConditionField(group.id, condition.id, $event)"
                          :options="getFieldOptions(group?.collection)"
                          placeholder="Select field..."
                        />
                      </div>

                      <div class="cond-field cond-field--operator">
                        <PolarisSelect
                          label="Operator"
                          size="small"
                          :modelValue="condition?.operator || 'equals'"
                          @update:modelValue="updateConditionOperator(group.id, condition.id, $event)"
                          :options="getOperatorOptions(group?.collection, condition?.field)"
                        />
                      </div>

                      <div v-if="isValueRequired(condition?.operator)" class="cond-field cond-field--grow">
                        <PolarisTextField
                          label="Value"
                          :modelValue="condition?.value || ''"
                          @update:modelValue="updateConditionValue(group.id, condition.id, $event)"
                        />
                      </div>

                      <PolarisButton variant="plain" icon="close" iconOnly @click="removeCondition(group.id, condition.id)" />
                    </div>
                  </div>
                </template>
              </div>

              <PolarisButton variant="plain" fullWidth @click="addCondition(group.id)">
                + Add Condition
              </PolarisButton>
            </template>

            <!-- ═══ AGGREGATE MODE ═══ -->
            <template v-if="getGroupType(group) === 'aggregate'">
              <!-- Function + Field -->
              <div class="polaris-condition-fields">
                <div class="cond-field cond-field--grow">
                  <PolarisSelect
                    label="Function"
                    :modelValue="group?.aggregate || 'sum'"
                    @update:modelValue="updateGroupField(group.id, 'aggregate', $event)"
                    :options="aggregateFunctionOptions"
                  />
                </div>
                <div class="cond-field cond-field--grow">
                  <PolarisSelect
                    label="Field"
                    :modelValue="group?.field || ''"
                    @update:modelValue="updateGroupField(group.id, 'field', $event)"
                    :options="getAggFieldOptions(group?.collection)"
                    placeholder="Select field..."
                  />
                </div>
              </div>

              <!-- Filters -->
              <div class="aggregate-section">
                <span class="aggregate-section__label">Filters (optional)</span>
                <div class="polaris-condition-list" v-if="group?.filters?.length">
                  <div
                    v-for="(filter, fIdx) in group.filters"
                    :key="filter?.id || fIdx"
                    class="polaris-condition-fields"
                  >
                    <div class="cond-field cond-field--grow">
                      <PolarisSelect
                        labelHidden
                        label="Field"
                        size="small"
                        :modelValue="filter?.field || ''"
                        @update:modelValue="updateAggFilter(group.id, filter.id, 'field', $event)"
                        :options="getFieldOptions(group?.collection)"
                        placeholder="Field..."
                      />
                    </div>
                    <div class="cond-field cond-field--operator">
                      <PolarisSelect
                        labelHidden
                        label="Operator"
                        size="small"
                        :modelValue="filter?.operator || 'equals'"
                        @update:modelValue="updateAggFilter(group.id, filter.id, 'operator', $event)"
                        :options="getOperatorOptions(group?.collection, filter?.field)"
                      />
                    </div>
                    <div v-if="isValueRequired(filter?.operator)" class="cond-field cond-field--grow">
                      <PolarisTextField
                        labelHidden
                        label="Value"
                        :modelValue="filter?.value || ''"
                        @update:modelValue="updateAggFilter(group.id, filter.id, 'value', $event)"
                      />
                    </div>
                    <PolarisButton variant="plain" icon="close" iconOnly @click="removeAggFilter(group.id, filter.id)" />
                  </div>
                </div>
                <PolarisButton variant="plain" @click="addAggFilter(group.id)">+ Add Filter</PolarisButton>
              </div>

              <!-- Time range -->
              <PolarisSelect
                label="Time range"
                :modelValue="group?.time_range || ''"
                @update:modelValue="updateGroupField(group.id, 'time_range', $event || null)"
                :options="timeRangeOptions"
              />

              <!-- Threshold -->
              <div class="polaris-condition-fields">
                <div class="cond-field cond-field--operator">
                  <PolarisSelect
                    label="Threshold"
                    :modelValue="group?.operator || 'gte'"
                    @update:modelValue="updateGroupField(group.id, 'operator', $event)"
                    :options="thresholdOperatorOptions"
                  />
                </div>
                <div class="cond-field cond-field--grow">
                  <PolarisTextField
                    label="Value"
                    type="number"
                    :modelValue="group?.value || ''"
                    @update:modelValue="updateGroupField(group.id, 'value', parseFloat($event) || 0)"
                  />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        No condition groups yet
      </div>

      <PolarisButton variant="outline" fullWidth @click="addGroup" style="margin-top: var(--p-space-300);">
        + Add Group
      </PolarisButton>
    </PolarisCardSection>
  </PolarisCard>
</template>

<script>
import { computed } from 'vue';
import {
  PolarisCard,
  PolarisCardSection,
  PolarisBlockStack,
  PolarisInline,
  PolarisTextField,
  PolarisSelect,
  PolarisButton,
  PolarisButtonGroup,
  PolarisText,
} from 'polaris-weweb-styles/components';

const OPERATORS_BY_TYPE = {
  string: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'not contains' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '≠' },
    { value: 'greater_than', label: '>' },
    { value: 'greater_than_or_equals', label: '≥' },
    { value: 'less_than', label: '<' },
    { value: 'less_than_or_equals', label: '≤' },
    { value: 'between', label: 'between' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
  ],
  date: [
    { value: 'equals', label: 'equals' },
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
    { value: 'between', label: 'between' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  array: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
};

const AGGREGATE_FUNCTIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'count', label: 'Count' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

const TIME_RANGES = [
  { value: '1 month', label: 'Past 1 month' },
  { value: '3 months', label: 'Past 3 months' },
  { value: '6 months', label: 'Past 6 months' },
  { value: '12 months', label: 'Past 12 months' },
  { value: '24 months', label: 'Past 24 months' },
  { value: '', label: 'All time' },
];

const THRESHOLD_OPERATORS = [
  { value: 'gte', label: '>=' },
  { value: 'gt', label: '>' },
  { value: 'eq', label: '=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
];

export default {
  name: 'ConditionConfig',
  components: {
    PolarisCard,
    PolarisCardSection,
    PolarisBlockStack,
    PolarisInline,
    PolarisTextField,
    PolarisSelect,
    PolarisButton,
    PolarisButtonGroup,
    PolarisText,
  },
  props: {
    config: { type: Object, required: true },
    collections: { type: Array, default: () => [] },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const safeCollections = computed(() => {
      return Array.isArray(props.collections) ? props.collections : [];
    });

    const collectionOptions = computed(() => {
      return safeCollections.value.map(col => ({
        value: col?.name,
        label: col?.label || col?.name,
      }));
    });

    const aggregateFunctionOptions = AGGREGATE_FUNCTIONS;
    const timeRangeOptions = TIME_RANGES;
    const thresholdOperatorOptions = THRESHOLD_OPERATORS;

    const emitUpdate = (newConfig) => {
      emit('update', newConfig);
    };

    const getCollectionMeta = (collectionName) => {
      return safeCollections.value.find(c => c?.name === collectionName) || null;
    };

    const collectionSupportsAggregate = (collectionName) => {
      return getCollectionMeta(collectionName)?.supports_aggregate === true;
    };

    const getGroupType = (group) => {
      return group?.type || 'simple';
    };

    const getFieldsForCollection = (collectionName) => {
      return getCollectionMeta(collectionName)?.fields || [];
    };

    const getAggregateFields = (collectionName) => {
      return getCollectionMeta(collectionName)?.aggregate_fields || [];
    };

    const getFieldType = (collectionName, fieldName) => {
      const fields = getFieldsForCollection(collectionName);
      const field = fields.find(f => f?.name === fieldName);
      return field?.type || 'string';
    };

    const getOperatorsForField = (collectionName, fieldName) => {
      const fieldType = getFieldType(collectionName, fieldName);
      return OPERATORS_BY_TYPE[fieldType] || OPERATORS_BY_TYPE.string;
    };

    const getFieldOptions = (collectionName) => {
      return getFieldsForCollection(collectionName).map(f => ({
        value: f?.name,
        label: f?.label || f?.name,
      }));
    };

    const getOperatorOptions = (collectionName, fieldName) => {
      return getOperatorsForField(collectionName, fieldName);
    };

    const getAggFieldOptions = (collectionName) => {
      return getAggregateFields(collectionName).map(f => ({
        value: f?.name,
        label: f?.label || f?.name,
      }));
    };

    const isValueRequired = (operator) => {
      return !['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(operator);
    };

    // ─── Group CRUD ──────────────────────────────────────────────

    const addGroup = () => {
      const groups = [...(props.config?.groups || [])];
      groups.push({
        id: `group-${Date.now()}`,
        type: 'simple',
        collection: '',
        operator: 'AND',
        conditions: [{
          id: `cond-${Date.now()}`,
          field: '',
          operator: 'equals',
          value: '',
        }],
      });
      emitUpdate({ ...props.config, groups });
    };

    const removeGroup = (groupId) => {
      const groups = (props.config?.groups || []).filter(g => g?.id !== groupId);
      emitUpdate({ ...props.config, groups });
    };

    const updateGroupCollection = (groupId, collection) => {
      const meta = getCollectionMeta(collection);
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id !== groupId) return g;

        const base = { ...g, collection, type: 'simple' };
        if (meta?.supports_aggregate && g?.type === 'aggregate') {
          const joinMeta = meta?.joinable_to || {};
          return {
            ...base,
            type: 'aggregate',
            aggregate: 'sum',
            field: '',
            join: joinMeta.table ? { table: joinMeta.table, on: joinMeta.on } : undefined,
            time_field: joinMeta.time_field || 'created_at',
            time_range: '12 months',
            filters: [],
            operator: 'gte',
            value: 0,
          };
        }
        return {
          ...base,
          conditions: [{
            id: `cond-${Date.now()}`,
            field: '',
            operator: 'equals',
            value: '',
          }],
        };
      });
      emitUpdate({ ...props.config, groups });
    };

    const updateGroupType = (groupId, type) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id !== groupId) return g;
        if (getGroupType(g) === type) return g;

        const collection = g?.collection || '';
        const meta = getCollectionMeta(collection);
        const joinMeta = meta?.joinable_to || {};

        if (type === 'aggregate') {
          return {
            id: g.id,
            type: 'aggregate',
            collection,
            aggregate: 'sum',
            field: '',
            join: joinMeta.table ? { table: joinMeta.table, on: joinMeta.on } : undefined,
            time_field: joinMeta.time_field || 'created_at',
            time_range: '12 months',
            filters: [],
            operator: 'gte',
            value: 0,
          };
        }
        return {
          id: g.id,
          type: 'simple',
          collection,
          operator: 'AND',
          conditions: [{
            id: `cond-${Date.now()}`,
            field: '',
            operator: 'equals',
            value: '',
          }],
        };
      });
      emitUpdate({ ...props.config, groups });
    };

    const updateGroupOperator = (groupId, operator) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id === groupId) return { ...g, operator };
        return g;
      });
      emitUpdate({ ...props.config, groups });
    };

    const updateGroupField = (groupId, field, value) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id === groupId) return { ...g, [field]: value };
        return g;
      });
      emitUpdate({ ...props.config, groups });
    };

    // ─── Simple condition CRUD ───────────────────────────────────

    const addCondition = (groupId) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id === groupId) {
          return {
            ...g,
            conditions: [
              ...(g?.conditions || []),
              { id: `cond-${Date.now()}`, field: '', operator: 'equals', value: '' },
            ],
          };
        }
        return g;
      });
      emitUpdate({ ...props.config, groups });
    };

    const removeCondition = (groupId, conditionId) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id === groupId) {
          return { ...g, conditions: (g?.conditions || []).filter(c => c?.id !== conditionId) };
        }
        return g;
      });
      emitUpdate({ ...props.config, groups });
    };

    const updateConditionField = (groupId, conditionId, field) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id === groupId) {
          return {
            ...g,
            conditions: (g?.conditions || []).map(c => {
              if (c?.id === conditionId) return { ...c, field, operator: 'equals', value: '' };
              return c;
            }),
          };
        }
        return g;
      });
      emitUpdate({ ...props.config, groups });
    };

    const updateConditionOperator = (groupId, conditionId, operator) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id === groupId) {
          return {
            ...g,
            conditions: (g?.conditions || []).map(c => {
              if (c?.id === conditionId) return { ...c, operator };
              return c;
            }),
          };
        }
        return g;
      });
      emitUpdate({ ...props.config, groups });
    };

    const updateConditionValue = (groupId, conditionId, value) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id === groupId) {
          return {
            ...g,
            conditions: (g?.conditions || []).map(c => {
              if (c?.id === conditionId) return { ...c, value };
              return c;
            }),
          };
        }
        return g;
      });
      emitUpdate({ ...props.config, groups });
    };

    // ─── Aggregate filter CRUD ───────────────────────────────────

    const addAggFilter = (groupId) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id === groupId) {
          return {
            ...g,
            filters: [
              ...(g?.filters || []),
              { id: `flt-${Date.now()}`, field: '', operator: 'equals', value: '' },
            ],
          };
        }
        return g;
      });
      emitUpdate({ ...props.config, groups });
    };

    const removeAggFilter = (groupId, filterId) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id === groupId) {
          return { ...g, filters: (g?.filters || []).filter(f => f?.id !== filterId) };
        }
        return g;
      });
      emitUpdate({ ...props.config, groups });
    };

    const updateAggFilter = (groupId, filterId, field, value) => {
      const groups = (props.config?.groups || []).map(g => {
        if (g?.id === groupId) {
          return {
            ...g,
            filters: (g?.filters || []).map(f => {
              if (f?.id !== filterId) return f;
              if (field === 'field') return { ...f, field: value, operator: 'equals', value: '' };
              return { ...f, [field]: value };
            }),
          };
        }
        return g;
      });
      emitUpdate({ ...props.config, groups });
    };

    return {
      collectionOptions,
      aggregateFunctionOptions,
      timeRangeOptions,
      thresholdOperatorOptions,
      emitUpdate,
      getGroupType,
      collectionSupportsAggregate,
      getFieldOptions,
      getAggFieldOptions,
      getOperatorOptions,
      isValueRequired,
      addGroup,
      removeGroup,
      updateGroupCollection,
      updateGroupType,
      updateGroupOperator,
      updateGroupField,
      addCondition,
      removeCondition,
      updateConditionField,
      updateConditionOperator,
      updateConditionValue,
      addAggFilter,
      removeAggFilter,
      updateAggFilter,
    };
  },
};
</script>

<style lang="scss" scoped>
@import 'polaris-weweb-styles';

.cond-group {
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-300);
  background: var(--p-color-bg-surface);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--p-space-200) var(--p-space-300);
    background: var(--p-color-bg-surface);
    border-bottom: 1px solid var(--p-color-border);
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: var(--p-space-200);
  }

  &__header-right {
    display: flex;
    align-items: center;
    gap: var(--p-space-200);
  }

  &__body {
    padding: var(--p-space-400);
    display: flex;
    flex-direction: column;
    gap: var(--p-space-400);
  }
}

.polaris-condition-list {
  @include polaris-tokens;
  display: flex;
  flex-direction: column;
  gap: var(--p-space-300);
  margin-top: var(--p-space-300);
}

.polaris-condition-item {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-200);
}

.polaris-condition-operator {
  display: flex;
  justify-content: center;
  padding: var(--p-space-100) 0;
  font-size: var(--p-font-size-300);
}

.polaris-condition-fields {
  display: flex;
  gap: var(--p-space-200);
  align-items: flex-end;
  width: 100%;

  > div { min-width: 0; }

  :deep(.polaris-text-field),
  :deep(.polaris-select) {
    min-height: 0;
  }

  :deep(select),
  :deep(input) {
    height: 36px;
    box-sizing: border-box;
  }
}

.cond-field {
  min-width: 0;
  &--grow { flex: 1; }
  &--operator { width: 160px; flex-shrink: 0; }
}

.condition-mode-toggle {
  margin-top: var(--p-space-300);
}

.aggregate-section {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-200);
  margin-top: var(--p-space-300);

  &__label {
    font-size: var(--p-font-size-300);
    font-weight: var(--p-font-weight-medium);
    color: var(--p-color-text);
  }

  .polaris-condition-list {
    margin-top: var(--p-space-100);
  }
}

.empty-state {
  @include polaris-tokens;
  text-align: center;
  padding: 12px 0;
  color: var(--p-color-text-secondary);
  font-size: var(--p-font-size-300);
}
</style>
