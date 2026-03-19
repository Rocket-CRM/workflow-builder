<template>
  <div class="constraint-builder">
    <div class="constraint-list">
      <div v-for="(rule, idx) in constraints" :key="idx" class="constraint-rule">
        <span class="constraint-rule__text">No more than</span>
        <input
          class="constraint-rule__number"
          type="number"
          min="1"
          :value="rule.limit"
          @input="update(idx, 'limit', parseInt($event.target.value) || 1)"
        />
        <select class="constraint-rule__select" :value="rule.metric" @change="update(idx, 'metric', $event.target.value)">
          <option value="actions">actions</option>
          <option value="points">points</option>
          <option value="tickets">tickets</option>
          <option value="messages">messages</option>
          <option value="cost">cost units</option>
        </select>
        <select class="constraint-rule__select" :value="rule.scope" @change="update(idx, 'scope', $event.target.value)">
          <option value="per_user">per user</option>
          <option value="per_workflow">total</option>
        </select>
        <select class="constraint-rule__select" :value="rule.window" @change="update(idx, 'window', $event.target.value)">
          <option value="per_execution">per execution</option>
          <option value="per_day">per day</option>
          <option value="per_week">per week</option>
          <option value="per_month">per month</option>
        </select>
        <button class="constraint-rule__remove" @click="remove(idx)">✕</button>
      </div>
    </div>
    <button class="constraint-add" @click="add">+ Add rule</button>
  </div>
</template>

<script>
export default {
  name: 'ConstraintBuilder',
  props: {
    constraints: { type: Array, default: () => [] },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const emitAll = (newList) => emit('update', newList);

    const add = () => {
      emitAll([...props.constraints, { metric: 'actions', limit: 3, scope: 'per_user', window: 'per_week' }]);
    };

    const remove = (idx) => {
      const list = [...props.constraints];
      list.splice(idx, 1);
      emitAll(list);
    };

    const update = (idx, field, value) => {
      const list = props.constraints.map((r, i) => i === idx ? { ...r, [field]: value } : r);
      emitAll(list);
    };

    return { add, remove, update };
  },
};
</script>

<style lang="scss" scoped>
@import 'polaris-weweb-styles';

.constraint-builder {
  @include polaris-tokens;
  display: flex;
  flex-direction: column;
  gap: var(--p-space-200);
}

.constraint-list {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-200);
}

.constraint-rule {
  display: flex;
  align-items: center;
  gap: var(--p-space-150);
  flex-wrap: wrap;
  padding: var(--p-space-200) var(--p-space-250);
  background: var(--p-color-bg-surface-secondary);
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-200);

  &__text {
    font-size: var(--p-font-size-300);
    color: var(--p-color-text-secondary);
    white-space: nowrap;
  }

  &__number {
    @include polaris-input;
    width: 56px;
    font-size: var(--p-font-size-300);
    text-align: center;
    padding: var(--p-space-100) var(--p-space-150);
  }

  &__select {
    @include polaris-select;
    font-size: var(--p-font-size-275);
    width: auto;
    min-width: 0;
    padding: var(--p-space-100) 22px var(--p-space-100) var(--p-space-200);
    background-position: right var(--p-space-100) center;
  }

  &__remove {
    border: none;
    background: none;
    color: var(--p-color-text-critical);
    cursor: pointer;
    font-size: var(--p-font-size-325);
    padding: var(--p-space-050) var(--p-space-100);
    margin-left: auto;
    flex-shrink: 0;
    opacity: 0.6;
    &:hover { opacity: 1; }
  }
}

.constraint-add {
  align-self: center;
  background: none;
  border: none;
  color: var(--p-color-text-brand);
  font-size: var(--p-font-size-300);
  font-weight: var(--p-font-weight-medium);
  cursor: pointer;
  padding: var(--p-space-100) var(--p-space-200);
  &:hover { text-decoration: underline; }
}
</style>
