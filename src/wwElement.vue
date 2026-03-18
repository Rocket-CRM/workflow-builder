<template>
  <div class="workflow-root" :style="rootContainerStyle">
    <!-- ═══ LIST VIEW ═══ -->
    <WorkflowList
      v-if="currentViewLocal === 'list'"
      :workflows="workflowsData"
      :loading="workflowsLoading"
      @select="openWorkflow"
      @create="createWorkflow"
      @toggle-status="handleWorkflowStatusToggle"
    />

    <!-- ═══ DETAIL / BUILDER VIEW ═══ -->
    <div v-else class="workflow-builder" :style="rootStyle">
    <!-- Toolbar -->
    <div v-if="!isReadOnly" class="toolbar">
      <div class="toolbar__left">
        <input
          class="toolbar__name-input"
          :value="workflowMeta.name || ''"
          placeholder="Untitled workflow"
          @input="handleNameChange($event.target.value)"
        />
        <span class="toolbar__badge" :class="workflowMeta.is_active ? 'toolbar__badge--live' : 'toolbar__badge--draft'">
          <span class="toolbar__badge-dot"></span>
          {{ workflowMeta.is_active ? 'Live' : 'Draft' }}
        </span>
      </div>
      <div class="toolbar__right">
        <button
          class="toolbar__icon-btn"
          :class="{ 'toolbar__icon-btn--active': settingsPanelOpen }"
          @click="toggleSettingsPanel"
          title="Workflow Settings"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M17.2 8l-1-.2c-.1-.4-.3-.7-.5-1l.5-.9c.2-.4.2-.9-.2-1.2l-1.2-1.2c-.4-.3-.8-.4-1.2-.2l-.9.5c-.3-.2-.7-.4-1-.5L11.5 2c-.1-.5-.5-.8-1-.8h-1.7c-.5 0-.9.4-1 .8l-.2 1c-.4.1-.7.3-1 .5l-.9-.5c-.4-.2-.9-.1-1.2.2L3.3 4.7c-.3.3-.4.8-.2 1.2l.5.9c-.2.3-.4.7-.5 1l-1 .2c-.5.1-.8.5-.8 1v1.7c0 .5.4.9.8 1l1 .2c.1.4.3.7.5 1l-.5.9c-.2.4-.1.9.2 1.2l1.2 1.2c.3.3.8.4 1.2.2l.9-.5c.3.2.7.4 1 .5l.2 1c.1.5.5.8 1 .8h1.7c.5 0 .9-.4 1-.8l.2-1c.4-.1.7-.3 1-.5l.9.5c.4.2.9.1 1.2-.2l1.2-1.2c.3-.3.4-.8.2-1.2l-.5-.9c.2-.3.4-.7.5-1l1-.2c.5-.1.8-.5.8-1V9c0-.5-.4-.9-.8-1zM10 13c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></svg>
        </button>
        <PolarisButton
          v-if="workflowMeta.is_active"
          @click="handleBatchRun"
        >Batch Run</PolarisButton>
        <PolarisButton @click="handleExit">Exit</PolarisButton>
        <PolarisButton variant="primary" @click="openStatusPanel">Update status</PolarisButton>
      </div>
    </div>

    <!-- Left Panel: Node Palette, Config Panel, or Settings (mutually exclusive) -->
    <div
      v-if="!isReadOnly"
      class="left-panel"
      :class="{ 'left-panel--config': configPanelOpen || settingsPanelOpen }"
    >
      <!-- Node Palette (visible when neither panel is open) -->
      <div v-if="!configPanelOpen && !settingsPanelOpen" class="node-palette">
        <div class="palette-heading">Add action</div>
        <div v-for="group in nodeGroups" :key="group.label" class="palette-group">
          <div class="palette-group__label">{{ group.label }}</div>
          <div
            v-for="nodeType in group.nodes"
            :key="nodeType.subType || nodeType.type"
            class="palette-item"
            draggable="true"
            @dragstart="onDragStart($event, nodeType)"
          >
            <span class="palette-item__icon" :style="{ '--icon-bg': (nodeType.color || getNodeColor(nodeType.type)) + '14', '--icon-color': nodeType.color || getNodeColor(nodeType.type) }">{{ nodeType.icon }}</span>
            <div class="palette-item__text">
              <span class="palette-item__label">{{ nodeType.label }}</span>
              <span v-if="nodeType.desc" class="palette-item__desc">{{ nodeType.desc }}</span>
            </div>
            <svg class="palette-item__chevron" width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M7.293 4.293a1 1 0 0 1 1.414 0l5 5a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414-1.414L11.586 10 7.293 5.707a1 1 0 0 1 0-1.414z"/></svg>
          </div>
        </div>
      </div>

      <!-- Config Panel (visible when editing a node) -->
      <div v-else-if="configPanelOpen" class="config-panel">
        <div class="config-panel__header">
          <div class="config-panel__header-left">
          <span class="config-panel__icon" :class="`config-panel__icon--${isEditingEntry ? 'entry' : editingNodeType}`">
            {{ isEditingEntry ? '🎯' : (nodeIconMap[editingNodeType] || '⚙️') }}
            </span>
            <div class="config-panel__header-info">
              <span class="config-panel__type-label">{{ isEditingEntry ? 'Entry Condition' : (nodeTypeLabels[editingNodeType] || 'Node') }}</span>
              <input
                v-model="editingConfig.label"
                class="config-panel__title-input"
                placeholder="Node label"
                @input="markConfigChanged"
              />
            </div>
          </div>
          <button class="config-panel__close-btn" @click="closeConfigPanel" title="Close">
            <svg viewBox="0 0 20 20" width="16" height="16"><path d="M11.414 10l4.293-4.293a1 1 0 00-1.414-1.414L10 8.586 5.707 4.293a1 1 0 00-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 101.414 1.414L10 11.414l4.293 4.293a1 1 0 001.414-1.414L11.414 10z" fill="currentColor"/></svg>
          </button>
        </div>

        <div class="config-panel__content">
          <TriggerConfig
            v-if="isEditingEntry && editingNodeType === 'condition'"
            :config="editingConfig"
            :collections="collectionsData"
            :audiences="audiencesData"
            @update="handleConfigUpdate"
          />
          <ConditionConfig
            v-else-if="editingNodeType === 'condition'"
            :config="editingConfig"
            :collections="collectionsData"
            @update="handleConfigUpdate"
          />
          <MessageConfig
            v-else-if="editingNodeType === 'message'"
            :config="editingConfig"
            :channels="channelsData"
            :templates="messageTemplatesData"
            @update="handleConfigUpdate"
          />
          <WaitConfig
            v-else-if="editingNodeType === 'wait'"
            :config="editingConfig"
            @update="handleConfigUpdate"
          />
          <ApiConfig
            v-else-if="editingNodeType === 'api'"
            :config="editingConfig"
            @update="handleConfigUpdate"
          />
        <ActionConfig
          v-else-if="editingNodeType === 'action'"
          :config="editingConfig"
          :audiences="audiencesData"
          :supabase-url="supabaseUrlData"
          :supabase-anon-key="supabaseAnonKeyData"
          :auth-token="authTokenData"
          @update="handleConfigUpdate"
        />
          <AgentConfig
            v-else-if="editingNodeType === 'agent'"
            :config="editingConfig"
            :agents="agentsData"
            :supabase-url="supabaseUrlData"
            :supabase-anon-key="supabaseAnonKeyData"
            :auth-token="authTokenData"
            @update="handleConfigUpdate"
          />

          <PolarisBanner v-if="configValidationErrorsList.length > 0" variant="critical" title="Validation errors">
            <ul><li v-for="(error, idx) in configValidationErrorsList" :key="idx">{{ error }}</li></ul>
          </PolarisBanner>
        </div>

        <div class="config-panel__footer">
          <PolarisButton @click="cancelConfigEdit">Cancel</PolarisButton>
          <PolarisButton variant="primary" @click="saveConfigEdit">Save</PolarisButton>
        </div>
      </div>

      <!-- Settings Panel (visible when settings is open) -->
      <div v-else-if="settingsPanelOpen" class="config-panel">
        <div class="config-panel__header">
          <div class="config-panel__header-left">
            <span class="config-panel__icon config-panel__icon--settings">⚙️</span>
            <div class="config-panel__header-info">
              <span class="config-panel__type-label">Workflow</span>
              <span class="config-panel__title-static">Settings</span>
            </div>
          </div>
          <button class="config-panel__close-btn" @click="closeSettingsPanel" title="Close">
            <svg viewBox="0 0 20 20" width="16" height="16"><path d="M11.414 10l4.293-4.293a1 1 0 00-1.414-1.414L10 8.586 5.707 4.293a1 1 0 00-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 101.414 1.414L10 11.414l4.293 4.293a1 1 0 001.414-1.414L11.414 10z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="config-panel__content">
          <WorkflowSettings
            :config="workflowConfigLocal"
            @update="handleWorkflowConfigUpdate"
          />
        </div>
        <div class="config-panel__footer">
          <PolarisButton @click="closeSettingsPanel">Cancel</PolarisButton>
          <PolarisButton variant="primary" @click="saveWorkflowSettings">Save</PolarisButton>
        </div>
      </div>
    </div>

    <!-- Main Canvas -->
    <div
      ref="canvasRef"
      class="canvas-container"
      :style="canvasStyle"
      @drop="onDrop"
      @dragover.prevent
      @dragenter.prevent
    >
      <VueFlow
        ref="vueFlowRef"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="customNodeTypes"
        :default-edge-options="defaultEdgeOptions"
        :nodes-draggable="!isReadOnly"
        :nodes-connectable="!isReadOnly"
        :edges-updatable="!isReadOnly"
        :elements-selectable="true"
        :zoom-on-scroll="true"
        :pan-on-scroll="false"
        :pan-on-drag="true"
        :default-viewport="{ x: 0, y: 0, zoom: 1 }"
        :fit-view-on-init="false"
        @node-click="onNodeClick"
        @connect="onConnect"
        @nodes-change="onNodesChange"
        @edges-change="onEdgesChange"
        @keydown="onKeyDown"
        @pane-ready="onPaneReady"
      >
        <Background :color="gridColorValue" :gap="16" />
        <Controls v-if="!isReadOnly" position="bottom-right" />
      </VueFlow>
    </div>

    <!-- Status Panel (right overlay) -->
    <div v-if="statusPanelOpen" class="status-panel">
      <div class="status-panel__content">
        <PolarisSelect
          label="Flow status"
          required
          :modelValue="pendingStatus"
          @update:modelValue="pendingStatus = $event"
          :options="[{ value: true, label: 'Live' }, { value: false, label: 'Draft' }]"
          helpText="Select a status for all actions in your workflow"
        />

        <div class="polaris-form-field">
          <label class="polaris-form-field__label">Run mode</label>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" value="on_event" v-model="pendingRunMode" />
              <div>
                <span class="radio-option__label">On Event</span>
                <span class="radio-option__help">Triggers automatically from CDC events</span>
              </div>
            </label>
            <label class="radio-option">
              <input type="radio" value="manual_only" v-model="pendingRunMode" />
              <div>
                <span class="radio-option__label">Manual Only</span>
                <span class="radio-option__help">Only runs via Batch Run</span>
              </div>
            </label>
          </div>
        </div>

        <div v-if="pendingStatus" class="polaris-form-field">
          <label class="batch-checkbox">
            <input type="checkbox" v-model="batchRunOnSave" />
            <span>Batch run for matching users</span>
          </label>
          <p class="polaris-form-field__help">Find and enroll all users that match the trigger conditions</p>
        </div>
      </div>

      <div class="status-panel__footer">
        <PolarisButton variant="primary" @click="saveStatus">Save</PolarisButton>
        <PolarisButton @click="closeStatusPanel">Cancel</PolarisButton>
      </div>
    </div>

    <!-- Batch Confirm Dialog -->
    <div v-if="batchConfirmOpen" class="batch-dialog-overlay" @click.self="closeBatchConfirm">
      <div class="batch-dialog">
        <p class="batch-dialog__message">Found <strong>{{ batchMatchingCount.toLocaleString() }}</strong> matching users. Run workflow for all of them?</p>
        <div class="batch-dialog__actions">
          <PolarisButton @click="closeBatchConfirm">Cancel</PolarisButton>
          <PolarisButton variant="primary" :disabled="batchDispatching" @click="confirmBatchDispatch">
            {{ batchDispatching ? 'Dispatching...' : 'Confirm' }}
          </PolarisButton>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toastMessage" class="toast" @click="toastMessage = ''">
      {{ toastMessage }}
    </div>

    <!-- User List Popup -->
    <NodeUserList
      v-if="userListOpen"
      :workflow-id="workflowMeta.id || ''"
      :node-id="userListNodeId"
      :node-name="userListNodeName"
      :supabase-url="supabaseUrlData"
      :supabase-anon-key="supabaseAnonKeyData"
      :auth-token="authTokenData"
      @close="closeUserList"
    />
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, h, markRaw, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { VueFlow, useVueFlow, Handle, Position } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import ConditionConfig from './components/ConditionConfig.vue';
import MessageConfig from './components/MessageConfig.vue';
import WaitConfig from './components/WaitConfig.vue';
import ApiConfig from './components/ApiConfig.vue';
import ActionConfig from './components/ActionConfig.vue';
import AgentConfig from './components/AgentConfig.vue';
import TriggerConfig from './components/TriggerConfig.vue';
import WorkflowList from './components/WorkflowList.vue';
import NodeUserList from './components/NodeUserList.vue';
import WorkflowSettings from './components/WorkflowSettings.vue';
import { useSupabaseApi } from './composables/useSupabaseApi';
import {
  PolarisButton,
  PolarisSelect,
  PolarisBanner,
} from 'polaris-weweb-styles/components';

// SVG Icons for node actions
const EditIcon = () => h('svg', { 
  width: '14', 
  height: '14', 
  viewBox: '0 0 24 24', 
  fill: 'none', 
  stroke: 'currentColor', 
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round'
}, [
  h('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
  h('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
]);

const DeleteIcon = () => h('svg', { 
  width: '14', 
  height: '14', 
  viewBox: '0 0 24 24', 
  fill: 'none', 
  stroke: 'currentColor', 
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round'
}, [
  h('polyline', { points: '3 6 5 6 21 6' }),
  h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }),
  h('line', { x1: '10', y1: '11', x2: '10', y2: '17' }),
  h('line', { x1: '14', y1: '11', x2: '14', y2: '17' })
]);

// Helper to create node action toolbar (right-aligned)
const createNodeActions = (props, showEdit, showDelete) => {
  const actions = [];
  
  if (showEdit) {
    actions.push(
      h('button', {
        class: 'node-action-btn node-action-edit',
        onClick: (e) => {
          e.stopPropagation();
          props.data?.onEdit?.(props.id);
        },
        title: 'Edit node'
      }, [h(EditIcon)])
    );
  }
  
  if (showDelete) {
    actions.push(
      h('button', {
        class: 'node-action-btn node-action-delete',
        onClick: (e) => {
          e.stopPropagation();
          props.data?.onDelete?.(props.id);
        },
        title: 'Delete node'
      }, [h(DeleteIcon)])
    );
  }
  
  if (actions.length === 0) return null;
  
  return h('div', { class: 'node-actions-toolbar' }, actions);
};

// Helper to create node body with optional type subtitle
const createNodeBody = (label, icon, badgeColor, typeSubtitle) => {
  const children = [];
  const textChildren = [];
  if (typeSubtitle) {
    textChildren.push(h('span', { class: 'node-type-subtitle' }, typeSubtitle));
  }
  textChildren.push(h('span', { class: 'node-label' }, label));
  children.push(h('div', { class: 'node-label-group' }, textChildren));
  children.push(h('div', { class: 'node-icon-badge', style: { '--badge-color': badgeColor } }, icon));
  return h('div', { class: 'node-body' }, children);
};

// Helper to create clickable stats footer on each node
const createNodeStats = (props, isWaitNode = false) => {
  const stats = props.data?.stats;
  const passed = stats?.unique_passed ?? null;
  if (passed === null) return null;

  const items = [
    h('span', { class: 'node-stats__item' }, [`👤 ${passed}`]),
  ];

  const waiting = stats?.currently_waiting || 0;
  if (isWaitNode || waiting > 0) {
    items.push(h('span', { class: `node-stats__item${waiting > 0 ? ' node-stats__item--waiting' : ''}` }, [`⏳ ${waiting}`]));
  }

  return h('div', {
    class: 'node-stats',
    onClick: (e) => {
      e.stopPropagation();
      props.data?.onStatsClick?.(props.id);
    },
  }, items);
};

// Node icon mapping
const nodeIconMap = {
  condition: '🔀',
  message: '✉️',
  wait: '⏱️',
  api: '🔌',
  action: '⚡',
  agent: '🤖',
  test: '🧪',
};

const nodeTypeLabels = {
  condition: 'Condition',
  message: 'Message',
  wait: 'Wait',
  api: 'API Call',
  action: 'Action',
  agent: 'Agent',
  test: 'Test',
};

// Custom Node Components - Shopify Flow style with LEFT/RIGHT handles
const ConditionNode = {
  name: 'ConditionNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'condition-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#3B82F6' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          createNodeBody(
            props.data?.label || 'Condition',
            '🔀',
            props.data?.color || '#3B82F6',
            null
          ),
          h(Handle, {
            type: 'source',
            position: Position.Right,
            id: 'output-true',
            class: 'flow-handle flow-handle-right',
            style: { top: '35%' },
          }),
          h(Handle, {
            type: 'source',
            position: Position.Right,
            id: 'output-false',
            class: 'flow-handle flow-handle-right',
            style: { top: '65%' },
          }),
          createNodeStats(props),
        ]
      );
  },
};

const MessageNode = {
  name: 'MessageNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'message-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#10B981' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Send Message'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#10B981' } }, '✉️'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
          createNodeStats(props),
        ]
      );
  },
};

const WaitNode = {
  name: 'WaitNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'wait-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#F59E0B' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Wait'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#F59E0B' } }, '⏱️'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
          createNodeStats(props, true),
        ]
      );
  },
};

const ApiNode = {
  name: 'ApiNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'api-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#8B5CF6' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'API Call'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#8B5CF6' } }, '🔌'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
          createNodeStats(props),
        ]
      );
  },
};

// Action node (for your database "action" type)
const ActionNode = {
  name: 'ActionNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'action-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#EC4899' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Action'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#EC4899' } }, '⚡'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
          createNodeStats(props),
        ]
      );
  },
};

const TestNode = {
  name: 'TestNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'test-node', { selected: props.selected }],
          style: { '--node-color': '#EC4899' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, 'TEST - ' + (props.data?.label || 'Working!')),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': '#EC4899' } }, '🧪'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
        ]
      );
  },
};

// Agent node - AI-powered decision with true/false branching
const AgentNode = {
  name: 'AgentNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'agent-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#06B6D4' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Agent'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#06B6D4' } }, '🤖'),
          ]),
          h(Handle, {
            type: 'source',
            position: Position.Right,
            id: 'output-true',
            class: 'flow-handle flow-handle-right',
            style: { top: '35%' },
          }),
          h(Handle, {
            type: 'source',
            position: Position.Right,
            id: 'output-false',
            class: 'flow-handle flow-handle-right',
            style: { top: '65%' },
          }),
          createNodeStats(props),
        ]
      );
  },
};

export default {
  name: 'WorkflowBuilder',
  components: {
    VueFlow,
    Background,
    Controls,
    ConditionConfig,
    MessageConfig,
    WaitConfig,
    ApiConfig,
    ActionConfig,
    AgentConfig,
    TriggerConfig,
    WorkflowList,
    NodeUserList,
    WorkflowSettings,
    PolarisButton,
    PolarisSelect,
    PolarisBanner,
  },
  props: {
    uid: { type: String, required: true },
    content: { type: Object, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  emits: ['trigger-event'],
  setup(props, { emit, expose }) {
    const canvasRef = ref(null);
    const vueFlowRef = ref(null);
    const nodes = ref([]);
    const edges = ref([]);
    const draggedNodeInfo = ref(null);
    const isInitialLoad = ref(true);

    // Custom node types registration
    const customNodeTypes = {
      condition: markRaw(ConditionNode),
      message: markRaw(MessageNode),
      wait: markRaw(WaitNode),
      api: markRaw(ApiNode),
      action: markRaw(ActionNode),
      agent: markRaw(AgentNode),
      test: markRaw(TestNode),
    };

    // Default edge options - very light, smooth bezier curve like Shopify Flow
    const defaultEdgeOptions = {
      type: 'default', // bezier curve (smoothest)
      animated: true,
      style: { 
        stroke: '#CCCCCC', 
        strokeWidth: 1,
        strokeDasharray: '4 3',
      },
      markerEnd: {
        type: 'arrowclosed',
        color: '#CCCCCC',
        width: 12,
        height: 12,
      },
    };

    const nodeGroups = [
      {
        label: 'Messages',
        nodes: [
          { type: 'action', subType: 'send_line', label: 'LINE Message', desc: 'Send a LINE message to the user', icon: '💬', color: '#06C755' },
          { type: 'action', subType: 'send_sms', label: 'SMS', desc: 'Send an SMS text message', icon: '📱', color: '#10B981' },
        ],
      },
      {
        label: 'Loyalty',
        nodes: [
          { type: 'action', subType: 'award_currency', label: 'Award Currency', desc: 'Give points or tickets', icon: '🪙', color: '#F59E0B' },
          { type: 'action', subType: 'assign_tag', label: 'Assign Tag', desc: 'Add a tag to the user', icon: '🏷️', color: '#F59E0B' },
          { type: 'action', subType: 'remove_tag', label: 'Remove Tag', desc: 'Remove a tag from the user', icon: '🏷️', color: '#EF4444' },
          { type: 'action', subType: 'assign_persona', label: 'Assign Persona', desc: 'Set the user persona', icon: '👤', color: '#F59E0B' },
          { type: 'action', subType: 'assign_earn_factor', label: 'Earn Factor', desc: 'Assign a time-limited earn factor', icon: '✨', color: '#F59E0B' },
          { type: 'action', subType: 'submit_form', label: 'Submit Form', desc: 'Auto-submit a form for the user', icon: '📋', color: '#F59E0B' },
        ],
      },
      {
        label: 'Audience',
        nodes: [
          { type: 'action', subType: 'add_to_audience', label: 'Add to Audience', desc: 'Add the user to an audience', icon: '👥', color: '#6366F1' },
          { type: 'action', subType: 'remove_from_audience', label: 'Remove from Audience', desc: 'Remove the user from an audience', icon: '🚪', color: '#F59E0B' },
        ],
      },
      {
        label: 'Integration',
        nodes: [
          { type: 'action', subType: 'api_call', label: 'Webhook', desc: 'Call an external API', icon: '🔗', color: '#8B5CF6' },
        ],
      },
      {
        label: 'Logic',
        nodes: [
          { type: 'wait', label: 'Time Delay', desc: 'Wait before continuing', icon: '⏱️', color: '#F59E0B' },
          { type: 'condition', label: 'Conditional Split', desc: 'Branch based on conditions', icon: '🔀', color: '#3B82F6' },
          { type: 'agent', label: 'AI Agent', desc: 'Let AI decide the next action', icon: '🤖', color: '#06B6D4' },
        ],
      },
    ];

    // ─── Supabase API Layer (must be before any code that references api) ──
    const supabaseUrlData = computed(() => 'https://wkevmsedchftztoolkmi.supabase.co');
    const supabaseAnonKeyData = computed(() => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXZtc2VkY2hmdHp0b29sa21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MTM2OTgsImV4cCI6MjA2NjA4OTY5OH0.bd8ELGtX8ACmk_WCxR_tIFljwyHgD3YD4PdBDpD-kSM');
    const authTokenData = computed(() => props.content?.authToken || '');

    const api = useSupabaseApi(authTokenData);

    // ─── List / Detail View ─────────────────────────────────────
    const { value: currentViewVar, setValue: setCurrentView } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'currentView',
        type: 'string',
        defaultValue: 'list',
      });

    const workflowsData = computed(() => {
      const propData = props.content?.workflows;
      if (Array.isArray(propData) && propData.length > 0) return propData;
      return api.workflows.value || [];
    });
    const hasWorkflowsList = computed(() => workflowsData.value.length > 0 || api.isReady.value);
    const workflowsLoading = computed(() => api.loading.value?.workflows || false);
    const currentViewLocal = ref(hasWorkflowsList.value ? 'list' : 'detail');

    const rootContainerStyle = computed(() => ({
      width: '100%',
      height: '100%',
      minHeight: '500px',
    }));

    const openWorkflow = async (workflow) => {
      workflowMeta.value = { ...workflow };
      currentViewLocal.value = 'detail';
      setCurrentView('detail');
      emit('trigger-event', {
        name: 'view-changed',
        event: { view: 'detail', mode: 'edit', workflowId: workflow?.id },
      });

      if (workflow?.id && api.isReady.value) {
        const detail = await api.fetchWorkflowDetail(workflow.id);
        if (detail) {
          const wf = detail?.workflow || detail;
          const dbNodes = detail?.nodes || wf?.nodes || [];
          const dbEdges = detail?.edges || wf?.edges || [];

          if (wf && typeof wf === 'object') {
            workflowMeta.value = { ...workflowMeta.value, ...wf };
          }

          isInitialLoad.value = true;
          const { nodes: vfNodes, edges: vfEdges } = dbToVueFlow(dbNodes, dbEdges);
          nodes.value = vfNodes;
          edges.value = vfEdges;
          setIsDirty(false);
          updateVariables();

          nextTick(() => {
            if (vueFlowRef.value && vfNodes.length > 0) {
              vueFlowRef.value.fitView({ padding: 0.2 });
            }
            setTimeout(() => { isInitialLoad.value = false; }, 100);
          });
        }
      }
    };

    const createWorkflow = () => {
      workflowMeta.value = {};
      currentViewLocal.value = 'detail';
      setCurrentView('detail');
      emit('trigger-event', {
        name: 'view-changed',
        event: { view: 'detail', mode: 'create' },
      });
      emit('trigger-event', { name: 'create-workflow', event: {} });
    };

    const goBackToList = () => {
      currentViewLocal.value = 'list';
      setCurrentView('list');
      emit('trigger-event', {
        name: 'view-changed',
        event: { view: 'list' },
      });

      if (api.isReady.value) {
        api.fetchWorkflows();
      }
    };

    const handleWorkflowStatusToggle = (workflow, isActive) => {
      emit('trigger-event', {
        name: 'workflow-status-toggled',
        event: { workflowId: workflow?.id, is_active: isActive },
      });
    };

    // Workflow metadata from props
    const workflowMeta = ref({});

    // Exposed Variables
    const { value: workflowData, setValue: setWorkflowData } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'workflowData',
        type: 'object',
        defaultValue: { p_workflow: {}, p_nodes: [], p_edges: [] },
      });

    const { value: isDirty, setValue: setIsDirty } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'isDirty',
        type: 'boolean',
        defaultValue: false,
      });

    const { value: nodeCount, setValue: setNodeCount } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'nodeCount',
        type: 'number',
        defaultValue: 0,
      });

    const { value: edgeCount, setValue: setEdgeCount } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'edgeCount',
        type: 'number',
        defaultValue: 0,
      });

    const { value: validationErrors, setValue: setValidationErrors } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'validationErrors',
        type: 'array',
        defaultValue: [],
      });

    const { value: selectedNodeId, setValue: setSelectedNodeId } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'selectedNodeId',
        type: 'string',
        defaultValue: '',
      });

    const { value: selectedNodeData, setValue: setSelectedNodeData } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'selectedNodeData',
        type: 'object',
        defaultValue: {},
      });

    // Config panel internal variables
    const { value: configPanelOpenVar, setValue: setConfigPanelOpen } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'configPanelOpen',
        type: 'boolean',
        defaultValue: false,
      });

    const { value: editingNodeIdVar, setValue: setEditingNodeId } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'editingNodeId',
        type: 'string',
        defaultValue: '',
      });

    const { value: editingNodeTypeVar, setValue: setEditingNodeType } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'editingNodeType',
        type: 'string',
        defaultValue: '',
      });

    const { value: editingConfigVar, setValue: setEditingConfigVar } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'editingConfig',
        type: 'object',
        defaultValue: {},
      });

    const { value: configHasChanges, setValue: setConfigHasChanges } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'configHasChanges',
        type: 'boolean',
        defaultValue: false,
      });

    const { value: configValidationErrors, setValue: setConfigValidationErrors } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'configValidationErrors',
        type: 'array',
        defaultValue: [],
      });

    // Config panel local state
    const configPanelOpen = ref(false);
    const editingConfig = ref({});
    const originalEditingConfig = ref({});
    const editingNodeType = ref('');
    const editingNodeIdLocal = ref('');

    // Data sources: self-fetched from Supabase, with prop overrides as fallback
    const collectionsData = computed(() => {
      const propData = props.content?.collections;
      if (Array.isArray(propData) && propData.length > 0) return propData;
      return api.collections.value || [];
    });
    const channelsData = computed(() => props.content?.channels || [
      { value: 'email', label: 'Email' },
      { value: 'sms', label: 'SMS' },
      { value: 'line', label: 'LINE' },
      { value: 'push', label: 'Push Notification' },
    ]);
    const messageTemplatesData = computed(() => props.content?.messageTemplates || []);
    const audiencesData = computed(() => {
      const propData = props.content?.audiences;
      if (Array.isArray(propData) && propData.length > 0) return propData;
      return api.audiences.value || [];
    });
    const agentsData = computed(() => {
      const propData = props.content?.agents;
      if (Array.isArray(propData) && propData.length > 0) return propData;
      return api.agents.value || [];
    });
    const configPanelWidth = computed(() => props.content?.configPanelWidth || '360px');
    const configPanelStyle = computed(() => ({ width: configPanelWidth.value }));
    const configValidationErrorsList = computed(() => configValidationErrors.value || []);

    // Expose fetched data as internal variables so users can inspect what was loaded
    const { value: fetchedWorkflows, setValue: setFetchedWorkflows } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'fetchedWorkflows',
        type: 'array',
        defaultValue: [],
      });
    const { value: fetchedCollections, setValue: setFetchedCollections } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'fetchedCollections',
        type: 'array',
        defaultValue: [],
      });
    const { value: fetchedAudiences, setValue: setFetchedAudiences } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'fetchedAudiences',
        type: 'array',
        defaultValue: [],
      });
    const { value: fetchedAgents, setValue: setFetchedAgents } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'fetchedAgents',
        type: 'array',
        defaultValue: [],
      });
    const { value: apiLoading, setValue: setApiLoading } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'apiLoading',
        type: 'object',
        defaultValue: {},
      });
    const { value: apiErrors, setValue: setApiErrors } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'apiErrors',
        type: 'object',
        defaultValue: {},
      });
    const { value: saveResult, setValue: setSaveResult } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'saveResult',
        type: 'object',
        defaultValue: null,
      });

    // Sync API state to internal variables
    watch(() => api.workflows.value, (v) => setFetchedWorkflows(v || []), { deep: true });
    watch(() => api.collections.value, (v) => setFetchedCollections(v || []), { deep: true });
    watch(() => api.audiences.value, (v) => setFetchedAudiences(v || []), { deep: true });
    watch(() => api.agents.value, (v) => setFetchedAgents(v || []), { deep: true });
    watch(() => api.loading.value, (v) => setApiLoading({ ...v }), { deep: true });
    watch(() => api.errors.value, (v) => setApiErrors({ ...v }), { deep: true });

    const deepClone = (obj) => {
      if (obj === null || obj === undefined) return obj;
      return JSON.parse(JSON.stringify(obj));
    };

    // Config panel handlers
    const openConfigPanel = (nodeId) => {
      const node = nodes.value.find(n => n.id === nodeId);
      if (!node) return;
      if (settingsPanelOpen.value) settingsPanelOpen.value = false;

      const cleanData = getCleanNodeData(node.data);
      editingConfig.value = deepClone(cleanData);
      originalEditingConfig.value = deepClone(cleanData);
      editingNodeType.value = node.type;
      editingNodeIdLocal.value = nodeId;
      configPanelOpen.value = true;

      setConfigPanelOpen(true);
      setEditingNodeId(nodeId);
      setEditingNodeType(node.type);
      setEditingConfigVar(cleanData);
      setConfigHasChanges(false);
      setConfigValidationErrors([]);

      emit('trigger-event', {
        name: 'config-panel-opened',
        event: { nodeId, nodeType: node.type },
      });
    };

    const closeConfigPanel = () => {
      configPanelOpen.value = false;
      editingConfig.value = {};
      originalEditingConfig.value = {};
      editingNodeType.value = '';
      editingNodeIdLocal.value = '';

      setConfigPanelOpen(false);
      setEditingNodeId('');
      setEditingNodeType('');
      setEditingConfigVar({});
      setConfigHasChanges(false);
      setConfigValidationErrors([]);

      emit('trigger-event', {
        name: 'config-panel-closed',
        event: {},
      });
    };

    const handleConfigUpdate = (newConfig) => {
      editingConfig.value = newConfig;
      setEditingConfigVar(newConfig);
      setConfigHasChanges(true);
    };

    const markConfigChanged = () => {
      setConfigHasChanges(true);
      setEditingConfigVar({ ...editingConfig.value });
    };

    const validateConfig = () => {
      const errors = [];
      const config = editingConfig.value;
      const nodeType = editingNodeType.value;

      if (nodeType === 'condition' && isEditingEntry.value) {
        const et = config?.entry_type || 'condition';
        if (et === 'audience') {
          if (!config?.audience_id) errors.push('Audience is required');
        } else {
          const groups = config?.groups || [];
          if (groups.length === 0) errors.push('At least one condition group is required');
          groups.forEach((group, gIdx) => {
            if (!group?.collection) errors.push(`Group ${gIdx + 1}: Collection is required`);
            const groupType = group?.type || 'simple';
            if (groupType === 'simple') {
              const conditions = group?.conditions || [];
              if (conditions.length === 0) errors.push(`Group ${gIdx + 1}: At least one condition is required`);
              conditions.forEach((condition, cIdx) => {
                if (!condition?.field) errors.push(`Group ${gIdx + 1}, Condition ${cIdx + 1}: Field is required`);
              });
            }
          });
        }
      } else if (nodeType === 'condition') {
        const groups = config?.groups || [];
        if (groups.length === 0) errors.push('At least one condition group is required');
        groups.forEach((group, gIdx) => {
          if (!group?.collection) errors.push(`Group ${gIdx + 1}: Collection is required`);
          const groupType = group?.type || 'simple';
          if (groupType === 'aggregate') {
            if (!group?.aggregate) errors.push(`Group ${gIdx + 1}: Aggregate function is required`);
            if (!group?.field) errors.push(`Group ${gIdx + 1}: Aggregate field is required`);
            if (group?.value === undefined || group?.value === null || group?.value === '') errors.push(`Group ${gIdx + 1}: Threshold value is required`);
          } else {
            const conditions = group?.conditions || [];
            if (conditions.length === 0) errors.push(`Group ${gIdx + 1}: At least one condition is required`);
            conditions.forEach((condition, cIdx) => {
              if (!condition?.field) errors.push(`Group ${gIdx + 1}, Condition ${cIdx + 1}: Field is required`);
            });
          }
        });
      } else if (nodeType === 'message') {
        if (!config?.channel) errors.push('Channel is required');
        if (!config?.template_id && !config?.content) errors.push('Either template or content is required');
        if (config?.channel === 'email' && !config?.subject) errors.push('Subject is required for email');
      } else if (nodeType === 'wait') {
        if (!config?.duration || config.duration <= 0) errors.push('Duration must be greater than 0');
      } else if (nodeType === 'api') {
        if (!config?.url) errors.push('URL is required');
      } else if (nodeType === 'action') {
        if (!config?.action_type) errors.push('Action type is required');
        const at = config?.action_type;
        if (at === 'award_currency') {
          if (!config?.amount || config.amount <= 0) errors.push('Amount must be greater than 0');
          if (config?.currency === 'ticket' && !config?.ticket_type_id) errors.push('Ticket type is required');
        }
        if ((at === 'assign_tag' || at === 'remove_tag') && !config?.tag_id) errors.push('Tag is required');
        if (at === 'assign_persona' && !config?.persona_id) errors.push('Persona is required');
        if (at === 'assign_earn_factor') {
          if (!config?.earn_factor_id) errors.push('Earn factor is required');
          if (!config?.window_end_days || config.window_end_days <= 0) errors.push('Duration must be greater than 0');
        }
        if (at === 'submit_form' && !config?.form_id) errors.push('Form template is required');
        if (at === 'send_line' && !config?.content) errors.push('Message content is required');
        if (at === 'send_sms' && !config?.message) errors.push('Message is required');
        if (at === 'api_call' && !config?.url) errors.push('URL is required');
        if ((at === 'add_to_audience' || at === 'remove_from_audience') && !config?.audience_id) errors.push('Audience is required');
      } else if (nodeType === 'agent') {
        if (!config?.agent_config_id) errors.push('Agent is required');
      }

      setConfigValidationErrors(errors);
      return errors;
    };

    const saveConfigEdit = () => {
      const errors = validateConfig();
      if (errors.length > 0) {
        emit('trigger-event', {
          name: 'validation-failed',
          event: { errors },
        });
        return;
      }

      const nodeId = editingNodeIdLocal.value;
      const config = deepClone(editingConfig.value);
      updateNodeConfig(nodeId, config);

      emit('trigger-event', {
        name: 'node-config-saved',
        event: { nodeId, config },
      });

      closeConfigPanel();
    };

    const cancelConfigEdit = () => {
      closeConfigPanel();
    };

    // Status panel state
    const statusPanelOpen = ref(false);
    const pendingStatus = ref(false);

    const pendingRunMode = ref(workflowMeta.value?.run_mode || 'on_event');
    const batchRunOnSave = ref(false);

    const openStatusPanel = () => {
      pendingStatus.value = workflowMeta.value?.is_active || false;
      pendingRunMode.value = workflowMeta.value?.run_mode || 'on_event';
      batchRunOnSave.value = false;
      statusPanelOpen.value = true;
    };

    const closeStatusPanel = () => {
      statusPanelOpen.value = false;
    };

    const saveStatus = () => {
      const newStatus = pendingStatus.value;
      const newRunMode = pendingRunMode.value;
      const runBatch = batchRunOnSave.value && newStatus;
      workflowMeta.value = { ...workflowMeta.value, is_active: newStatus, run_mode: newRunMode };
      updateVariables();
      statusPanelOpen.value = false;
      batchRunOnSave.value = false;

      emit('trigger-event', {
        name: 'status-updated',
        event: { is_active: newStatus, run_mode: newRunMode, p_run_batch: runBatch },
      });

      if (runBatch) {
        triggerBatchFromSave();
      }
    };

    // ─── Batch Run ───────────────────────────────────────────────
    const batchConfirmOpen = ref(false);
    const batchMatchingCount = ref(0);
    const batchUserIds = ref([]);
    const batchDispatching = ref(false);
    const toastMessage = ref('');

    const triggerBatchFromSave = async () => {
      const wfId = workflowMeta.value?.id;
      if (!wfId) return;
      try {
        const data = await api.batchRun(wfId);
        if (data?.success !== false && data?.matching_users > 0) {
          batchMatchingCount.value = data.matching_users;
          batchUserIds.value = data.user_ids || [];
          batchConfirmOpen.value = true;
        } else if (data?.matching_users === 0) {
          toastMessage.value = 'No matching users found (or all already enrolled)';
          setTimeout(() => { toastMessage.value = ''; }, 4000);
        }
      } catch (err) {
        console.error('[WorkflowBuilder] Batch run failed:', err);
      }
    };

    const handleBatchRun = async () => {
      const wfId = workflowMeta.value?.id;
      if (!wfId || !workflowMeta.value?.is_active) return;
      try {
        toastMessage.value = 'Finding matching users...';
        const data = await api.batchRun(wfId);
        toastMessage.value = '';
        if (data?.success !== false && data?.matching_users > 0) {
          batchMatchingCount.value = data.matching_users;
          batchUserIds.value = data.user_ids || [];
          batchConfirmOpen.value = true;
        } else {
          toastMessage.value = 'No matching users found (or all already enrolled)';
          setTimeout(() => { toastMessage.value = ''; }, 4000);
        }
      } catch (err) {
        console.error('[WorkflowBuilder] Batch run failed:', err);
        toastMessage.value = 'Batch run failed';
        setTimeout(() => { toastMessage.value = ''; }, 4000);
      }
    };

    const confirmBatchDispatch = async () => {
      const wfId = workflowMeta.value?.id;
      const merchantId = workflowMeta.value?.merchant_id;
      if (!wfId || !batchUserIds.value.length) return;

      batchDispatching.value = true;
      try {
        const data = await api.batchDispatch(wfId, merchantId, batchUserIds.value);
        batchConfirmOpen.value = false;
        toastMessage.value = `Batch run complete: ${data?.dispatched?.toLocaleString() || batchMatchingCount.value.toLocaleString()} users dispatched`;
        setTimeout(() => { toastMessage.value = ''; }, 5000);
      } catch (err) {
        console.error('[WorkflowBuilder] Batch dispatch failed:', err);
        toastMessage.value = 'Batch dispatch failed';
        setTimeout(() => { toastMessage.value = ''; }, 4000);
      } finally {
        batchDispatching.value = false;
        batchUserIds.value = [];
        batchMatchingCount.value = 0;
      }
    };

    const closeBatchConfirm = () => {
      batchConfirmOpen.value = false;
      batchUserIds.value = [];
      batchMatchingCount.value = 0;
    };

    // ─── Workflow Settings Panel ─────────────────────────────────
    const settingsPanelOpen = ref(false);
    const workflowConfigLocal = ref({});

    const toggleSettingsPanel = () => {
      if (settingsPanelOpen.value) {
        closeSettingsPanel();
      } else {
        openSettingsPanel();
      }
    };

    const openSettingsPanel = () => {
      if (configPanelOpen.value) closeConfigPanel();
      workflowConfigLocal.value = JSON.parse(JSON.stringify(workflowMeta.value?.config || {}));
      settingsPanelOpen.value = true;
    };

    const closeSettingsPanel = () => {
      settingsPanelOpen.value = false;
      workflowConfigLocal.value = {};
    };

    const handleWorkflowConfigUpdate = (newConfig) => {
      workflowConfigLocal.value = newConfig;
    };

    const saveWorkflowSettings = () => {
      workflowMeta.value = { ...workflowMeta.value, config: JSON.parse(JSON.stringify(workflowConfigLocal.value)) };
      setIsDirty(true);
      updateVariables();
      settingsPanelOpen.value = false;

      emit('trigger-event', {
        name: 'workflow-changed',
        event: { is_dirty: true },
      });
    };

    // Toolbar handlers
    const handleNameChange = (value) => {
      workflowMeta.value = { ...workflowMeta.value, name: value };
      setIsDirty(true);
      updateVariables();

      emit('trigger-event', {
        name: 'workflow-changed',
        event: { is_dirty: true },
      });
    };

    const handleToolbarSave = () => {
      save();
    };

    const handleExit = () => {
      if (hasWorkflowsList.value) {
        goBackToList();
      } else {
        emit('trigger-event', {
          name: 'exit',
          event: { is_dirty: isDirty.value },
        });
      }
    };

    // ─── Node Stats + User List ──────────────────────────────────
    const nodeStatsMap = ref({});
    const userListOpen = ref(false);
    const userListNodeId = ref('');
    const userListNodeName = ref('');

    const fetchNodeStats = async () => {
      const wfId = workflowMeta.value?.id || props.content?.initialWorkflow?.id;
      if (!wfId || !api.isReady.value) return;
      try {
        const data = await api.fetchNodeStats(wfId);
        if (data?.success !== false && Array.isArray(data?.nodes)) {
          const map = {};
          data.nodes.forEach(n => { map[n.node_id] = { unique_passed: n.unique_passed || 0, currently_waiting: n.currently_waiting || 0 }; });
          nodeStatsMap.value = map;
          applyStatsToNodes();
        }
      } catch (err) {
        console.error('[WorkflowBuilder] Failed to fetch node stats:', err);
      }
    };

    const applyStatsToNodes = () => {
      const map = nodeStatsMap.value;
      if (!Object.keys(map).length) return;
      nodes.value = nodes.value.map(node => ({
        ...node,
        data: {
          ...node.data,
          stats: map[node.id] || null,
          onStatsClick: handleStatsClick,
        },
      }));
    };

    const handleStatsClick = (nodeId) => {
      const node = nodes.value.find(n => n.id === nodeId);
      userListNodeId.value = nodeId;
      userListNodeName.value = node?.data?.label || 'Node';
      userListOpen.value = true;
    };

    const closeUserList = () => {
      userListOpen.value = false;
      userListNodeId.value = '';
      userListNodeName.value = '';
    };

    // Computed styles
    const isReadOnly = computed(() => props.content?.readOnly === true);

    const entryNodeId = computed(() => {
      const targetIds = new Set(edges.value.map(e => e.target));
      const entry = nodes.value.find(n => n.type === 'condition' && !targetIds.has(n.id));
      return entry?.id || '';
    });

    const isEditingEntry = computed(() => {
      return editingNodeIdLocal.value && editingNodeIdLocal.value === entryNodeId.value;
    });

    const rootStyle = computed(() => ({
      '--sidebar-width': props.content?.sidebarWidth || '150px',
      '--sidebar-bg': props.content?.sidebarBackground || '#F9FAFB',
      '--canvas-bg': props.content?.canvasBackground || '#FFFFFF',
    }));

    const sidebarStyle = computed(() => ({
      width: props.content?.sidebarWidth || '150px',
      backgroundColor: props.content?.sidebarBackground || '#F9FAFB',
    }));

    const canvasStyle = computed(() => ({
      backgroundColor: props.content?.canvasBackground || '#FFFFFF',
    }));

    const gridColorValue = computed(() => props.content?.gridColor || '#E5E7EB');

    // Get node color based on type
    const getNodeColor = (type) => {
      const colors = {
        condition: props.content?.conditionNodeColor || '#3B82F6',
        action: props.content?.actionNodeColor || '#EC4899',
        message: props.content?.messageNodeColor || '#10B981',
        wait: props.content?.waitNodeColor || '#F59E0B',
        api: props.content?.apiNodeColor || '#8B5CF6',
        agent: props.content?.agentNodeColor || '#06B6D4',
      };
      return colors[type] || '#6B7280';
    };

    // Node action visibility
    const showEditAction = computed(() => props.content?.showEditAction !== false);
    const showDeleteAction = computed(() => props.content?.showDeleteAction !== false);

    // Default data structures for each node type
    // Action sub-type defaults (used when dragging specific actions from palette)
    const actionSubTypeDefaults = {
      award_currency: { action_type: 'award_currency', currency: 'points', amount: 100, description: '' },
      assign_tag: { action_type: 'assign_tag', tag_id: '' },
      remove_tag: { action_type: 'remove_tag', tag_id: '' },
      assign_persona: { action_type: 'assign_persona', persona_id: '' },
      assign_earn_factor: { action_type: 'assign_earn_factor', earn_factor_id: '', window_end_days: 30 },
      submit_form: { action_type: 'submit_form', form_id: '', field_values: {} },
      send_line: { action_type: 'send_line', channel: 'line', content: '', json_content: null },
      send_sms: { action_type: 'send_sms', channel: 'sms', message: '' },
      api_call: { action_type: 'api_call', method: 'POST', url: '', body: null },
      add_to_audience: { action_type: 'add_to_audience', audience_id: '' },
      remove_from_audience: { action_type: 'remove_from_audience', audience_id: '' },
    };

    const getDefaultNodeData = (type, subType = null, label = null) => {
      if (type === 'action' && subType && actionSubTypeDefaults[subType]) {
        return { label: label || subType, ...actionSubTypeDefaults[subType] };
      }

      const defaults = {
        condition: { label: 'New Condition', groups_operator: 'AND', groups: [] },
        action: { label: 'New Action', action_type: null },
        message: { label: 'New Message', channel: null, template_id: null, subject: '', content: '', json_content: null },
        wait: { label: 'New Wait', duration: 1, unit: 'days' },
        api: { label: 'New API Call', method: 'POST', url: '', headers: {}, body: '', timeout_seconds: 30, retry_count: 2 },
        agent: { label: 'New Agent', agent_config_id: '' },
      };
      return defaults[type] || { label: label || `New ${type}` };
    };

    // Strip internal fields from node data for clean event emission
    const getCleanNodeData = (data) => {
      if (!data) return {};
      const { color, showEditAction, showDeleteAction, onEdit, onDelete, ...cleanData } = data;
      return cleanData;
    };

    // Build clean node object for event emission
    const buildNodeEvent = (node) => {
      if (!node) return null;
      return {
        id: node.id,
        type: node.type,
        position: { ...node.position },
        data: getCleanNodeData(node.data),
      };
    };

    // Node action handlers
    const handleNodeEdit = (nodeId) => {
      const node = nodes.value.find(n => n.id === nodeId);
      if (!node) return;
      
      const nodeEvent = buildNodeEvent(node);
      
      setSelectedNodeId(nodeId);
      setSelectedNodeData(nodeEvent);
      
      openConfigPanel(nodeId);
      
      emit('trigger-event', {
        name: 'node-edit',
        event: nodeEvent,
      });
    };
    
    const handleNodeDelete = (nodeId) => {
      if (isReadOnly.value) return;
      if (nodeId === entryNodeId.value) return;
      
      const node = nodes.value.find(n => n.id === nodeId);
      if (!node) return;
      
      // Build event before removing node
      const nodeEvent = buildNodeEvent(node);
      
      // Remove the node
      nodes.value = nodes.value.filter(n => n.id !== nodeId);
      
      // Remove connected edges
      edges.value = edges.value.filter(
        e => e.source !== nodeId && e.target !== nodeId
      );
      
      // Clear selection if deleted node was selected
      if (selectedNodeId.value === nodeId) {
        setSelectedNodeId('');
        setSelectedNodeData({});
      }
      
      setIsDirty(true);
      updateVariables();
      
      emit('trigger-event', {
        name: 'node-deleted',
        event: nodeEvent,
      });
      
      emit('trigger-event', {
        name: 'workflow-changed',
        event: { is_dirty: true },
      });
    };

    // Data format conversion: Database → Vue Flow
    // Handles both field formats:
    // - node_name (DB field) or node_config.label (old format)
    // - from_node_id/to_node_id (DB fields) or source/target (Vue Flow format)
    const dbToVueFlow = (dbNodes, dbEdges) => {
      const filteredNodes = (dbNodes || []).filter(n => n?.node_type !== 'trigger');
      const triggerIds = new Set((dbNodes || []).filter(n => n?.node_type === 'trigger').map(n => n?.id));
      const filteredEdges = (dbEdges || []).filter(e => {
        const fromId = e?.from_node_id || e?.source || '';
        const toId = e?.to_node_id || e?.target || '';
        return !triggerIds.has(fromId) && !triggerIds.has(toId);
      });

      const vfNodes = filteredNodes.map((node) => {
        const nodeType = node?.node_type || 'message';
        // Get label from node_name (DB) or node_config.label (fallback)
        const label = node?.node_name || node?.node_config?.label || `New ${nodeType}`;
        
        return {
          id: node?.id || crypto.randomUUID(),
          type: nodeType,
          position: {
            x: Number(node?.position_x) || 100,
            y: Number(node?.position_y) || 100,
          },
          data: {
            label,
            ...(node?.node_config || {}),
            color: getNodeColor(nodeType),
            showEditAction: showEditAction.value,
            showDeleteAction: showDeleteAction.value,
            onEdit: handleNodeEdit,
            onDelete: handleNodeDelete,
            stats: nodeStatsMap.value[node?.id] || null,
            onStatsClick: handleStatsClick,
          },
        };
      });

      const vfEdges = filteredEdges.map((edge) => ({
        id: edge?.id || crypto.randomUUID(),
        // Handle both DB format (from_node_id/to_node_id) and Vue Flow format (source/target)
        source: edge?.from_node_id || edge?.source || '',
        target: edge?.to_node_id || edge?.target || '',
        sourceHandle: edge?.source_handle || edge?.sourceHandle || 'output',
        targetHandle: edge?.target_handle || edge?.targetHandle || 'input',
        label: edge?.edge_label || edge?.label || undefined,
        type: 'default', // bezier curve - smooth S-shape
        animated: true,
      }));

      return { nodes: vfNodes, edges: vfEdges };
    };

    // Data format conversion: Vue Flow → Database
    const vueFlowToDb = (vfNodes, vfEdges) => {
      const dbNodes = (vfNodes || []).map((node) => {
        const cleanData = { ...node?.data };
        delete cleanData.color;
        delete cleanData.showEditAction;
        delete cleanData.showDeleteAction;
        delete cleanData.onEdit;
        delete cleanData.onDelete;
        delete cleanData.stats;
        delete cleanData.onStatsClick;
        
        return {
          id: node?.id,
          node_type: node?.type,
          node_name: node?.data?.label || `New ${node?.type}`,
          position_x: node?.position?.x || 0,
          position_y: node?.position?.y || 0,
          node_config: cleanData,
        };
      });

      const dbEdges = (vfEdges || []).map((edge) => ({
        id: edge?.id,
        from_node_id: edge?.source,
        to_node_id: edge?.target,
        source_handle: edge?.sourceHandle || 'output',
        edge_label: edge?.label || null,
      }));

      return { nodes: dbNodes, edges: dbEdges };
    };

    // Update exposed variables with full API payload structure
    const updateVariables = () => {
      const currentNodes = nodes.value || [];
      const currentEdges = edges.value || [];

      setNodeCount(currentNodes.length);
      setEdgeCount(currentEdges.length);

      // Build p_nodes in database format
      const p_nodes = currentNodes.map((node) => {
        const cleanData = { ...node?.data };
        delete cleanData.color;
        delete cleanData.showEditAction;
        delete cleanData.showDeleteAction;
        delete cleanData.onEdit;
        delete cleanData.onDelete;
        delete cleanData.stats;
        delete cleanData.onStatsClick;
        
        return {
          id: node?.id,
          node_type: node?.type,
          node_name: node?.data?.label || `New ${node?.type}`,
          position_x: Math.round(node?.position?.x || 0),
          position_y: Math.round(node?.position?.y || 0),
          node_config: cleanData,
        };
      });

      // Build p_edges in database format
      const p_edges = currentEdges.map((edge) => ({
        id: edge?.id,
        from_node_id: edge?.source,
        to_node_id: edge?.target,
        source_handle: edge?.sourceHandle || 'output',
        edge_label: edge?.label || null,
      }));

      const wfMeta = workflowMeta.value || {};
      setWorkflowData({
        p_workflow: {
          ...wfMeta,
          scope: wfMeta.scope || 'user',
          domain: wfMeta.domain || 'campaign',
        },
        p_nodes,
        p_edges,
      });
    };

    // Validation logic
    const validate = () => {
      const errors = [];
      const currentNodes = nodes.value || [];
      const currentEdges = edges.value || [];

      // Check if at least 1 node exists
      if (currentNodes.length === 0) {
        errors.push('No nodes in workflow');
      }

      // Check for disconnected nodes
      if (currentNodes.length > 0) {
        const connectedNodeIds = new Set();
        currentEdges.forEach((edge) => {
          connectedNodeIds.add(edge?.source);
          connectedNodeIds.add(edge?.target);
        });

        // If there's only one node, it's allowed to be disconnected
        if (currentNodes.length > 1) {
          currentNodes.forEach((node) => {
            if (!connectedNodeIds.has(node?.id)) {
              const label = node?.data?.label || node?.type || 'Unknown';
              errors.push(`Node "${label}" is disconnected`);
            }
          });
        }
      }

      setValidationErrors(errors);

      if (errors.length > 0) {
        emit('trigger-event', {
          name: 'validation-failed',
          event: { errors },
        });
      }

      return { valid: errors.length === 0, errors };
    };

    // Save action - saves directly via bff_upsert_amp_workflow_with_graph RPC
    const save = async () => {
      const validation = validate();

      if (!validation.valid) {
        return { valid: false, errors: validation.errors };
      }

      // Build p_nodes in database format
      const p_nodes = nodes.value.map((node) => {
        const cleanData = { ...node?.data };
        delete cleanData.color;
        delete cleanData.showEditAction;
        delete cleanData.showDeleteAction;
        delete cleanData.onEdit;
        delete cleanData.onDelete;
        delete cleanData.stats;
        delete cleanData.onStatsClick;
        
        return {
          id: node?.id,
          node_type: node?.type,
          node_name: node?.data?.label || `New ${node?.type}`,
          position_x: Math.round(node?.position?.x || 0),
          position_y: Math.round(node?.position?.y || 0),
          node_config: cleanData,
        };
      });

      // Build p_edges in database format
      const p_edges = edges.value.map((edge) => ({
        id: edge?.id,
        from_node_id: edge?.source,
        to_node_id: edge?.target,
        source_handle: edge?.sourceHandle || 'output',
        edge_label: edge?.label || null,
      }));

      const wfMeta = workflowMeta.value || {};
      const payload = {
        p_workflow: {
          ...wfMeta,
          scope: wfMeta.scope || 'user',
          domain: wfMeta.domain || 'campaign',
        },
        p_nodes,
        p_edges,
      };

      // Save directly via Supabase RPC
      if (api.isReady.value) {
        try {
          const result = await api.saveWorkflow(payload);
          setSaveResult(result);

          if (result?.workflow_id) {
            workflowMeta.value = { ...workflowMeta.value, id: result.workflow_id };
          }

          toastMessage.value = 'Workflow saved';
          setTimeout(() => { toastMessage.value = ''; }, 3000);

          setIsDirty(false);
          updateVariables();

          emit('trigger-event', {
            name: 'workflow-saved',
            event: { ...payload, result },
          });

          api.fetchWorkflows();

          return { ...payload, result };
        } catch (err) {
          console.error('[WorkflowBuilder] Save failed:', err);
          toastMessage.value = 'Save failed: ' + (err?.message || 'Unknown error');
          setTimeout(() => { toastMessage.value = ''; }, 5000);

          emit('trigger-event', {
            name: 'workflow-saved',
            event: payload,
          });

          return payload;
        }
      }

      setIsDirty(false);
      updateVariables();

      emit('trigger-event', {
        name: 'workflow-saved',
        event: payload,
      });

      return payload;
    };

    // Clear action
    const clear = () => {
      nodes.value = [];
      edges.value = [];
      setSelectedNodeId('');
      setSelectedNodeData({});
      setIsDirty(true);
      updateVariables();

      emit('trigger-event', {
        name: 'workflow-changed',
        event: { is_dirty: true },
      });

      return { success: true };
    };

    // Update node config action
    const updateNodeConfig = (nodeId, config) => {
      if (!nodeId || !config) {
        return { success: false, error: 'nodeId and config are required' };
      }

      const nodeIndex = nodes.value.findIndex(n => n.id === nodeId);
      if (nodeIndex === -1) {
        return { success: false, error: 'Node not found' };
      }

      // Update the node's data while preserving internal fields
      const existingNode = nodes.value[nodeIndex];
      const updatedNode = {
        ...existingNode,
        data: {
          ...config,
          color: getNodeColor(existingNode.type),
          showEditAction: showEditAction.value,
          showDeleteAction: showDeleteAction.value,
          onEdit: handleNodeEdit,
          onDelete: handleNodeDelete,
          stats: existingNode.data?.stats || null,
          onStatsClick: handleStatsClick,
        },
      };

      // Update nodes array
      nodes.value = [
        ...nodes.value.slice(0, nodeIndex),
        updatedNode,
        ...nodes.value.slice(nodeIndex + 1),
      ];

      // Update selected node data if this is the selected node
      if (selectedNodeId.value === nodeId) {
        setSelectedNodeData(buildNodeEvent(updatedNode));
      }

      setIsDirty(true);
      updateVariables();

      emit('trigger-event', {
        name: 'workflow-changed',
        event: { is_dirty: true },
      });

      return { success: true, node: buildNodeEvent(updatedNode) };
    };

    // Add node helper function
    const addNode = (type, x, y, subType = null, label = null) => {
      const defaultData = getDefaultNodeData(type, subType, label);
      
      const newNode = {
        id: crypto.randomUUID(),
        type,
        position: { x, y },
        data: {
          ...defaultData,
          color: getNodeColor(type),
          showEditAction: showEditAction.value,
          showDeleteAction: showDeleteAction.value,
          onEdit: handleNodeEdit,
          onDelete: handleNodeDelete,
          stats: null,
          onStatsClick: handleStatsClick,
        },
      };

      nodes.value = [...nodes.value, newNode];

      if (!isInitialLoad.value) {
        setIsDirty(true);
        emit('trigger-event', {
          name: 'workflow-changed',
          event: { is_dirty: true },
        });
      }

      updateVariables();
      return newNode;
    };

    // Drag and Drop handlers
    const onDragStart = (event, nodeInfo) => {
      if (isReadOnly.value) return;
      draggedNodeInfo.value = nodeInfo;
      event.dataTransfer.setData('application/vueflow', nodeInfo?.type || nodeInfo);
      event.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = (event) => {
      event.preventDefault();
      if (isReadOnly.value) return;

      const info = draggedNodeInfo.value;
      const fallbackType = event.dataTransfer.getData('application/vueflow');
      const nodeType = info?.type || fallbackType;
      if (!nodeType) return;

      const bounds = canvasRef.value?.getBoundingClientRect();
      if (!bounds) return;

      let x = event.clientX - bounds.left;
      let y = event.clientY - bounds.top;

      const vfInstance = vueFlowRef.value;
      if (vfInstance?.viewport) {
        const { viewport } = vfInstance;
        x = (x - viewport.x) / viewport.zoom;
        y = (y - viewport.y) / viewport.zoom;
      }

      addNode(nodeType, x, y, info?.subType, info?.label);
      draggedNodeInfo.value = null;
    };

    // Node click handler
    const onNodeClick = (event) => {
      const node = event.node;
      if (!node) return;

      const nodeEvent = buildNodeEvent(node);

      setSelectedNodeId(node.id);
      setSelectedNodeData(nodeEvent);

      emit('trigger-event', {
        name: 'node-selected',
        event: nodeEvent,
      });
    };

    // Connection handler
    const onConnect = (params) => {
      if (isReadOnly.value) return;

      const newEdge = {
        id: crypto.randomUUID(),
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle || 'output',
        targetHandle: params.targetHandle || 'input',
        type: 'default', // bezier curve
        animated: true,
      };

      edges.value = [...edges.value, newEdge];

      if (!isInitialLoad.value) {
        setIsDirty(true);
        emit('trigger-event', {
          name: 'workflow-changed',
          event: { is_dirty: true },
        });
      }

      updateVariables();
    };

    // Changes handlers
    const onNodesChange = (changes) => {
      if (isInitialLoad.value) return;

      const hasRealChanges = changes.some(
        (change) =>
          change.type === 'position' ||
          change.type === 'remove' ||
          change.type === 'add'
      );

      if (hasRealChanges && !isReadOnly.value) {
        setIsDirty(true);
        emit('trigger-event', {
          name: 'workflow-changed',
          event: { is_dirty: true },
        });
      }

      updateVariables();
    };

    const onEdgesChange = (changes) => {
      if (isInitialLoad.value) return;

      const hasRealChanges = changes.some(
        (change) => change.type === 'remove' || change.type === 'add'
      );

      if (hasRealChanges && !isReadOnly.value) {
        setIsDirty(true);
        emit('trigger-event', {
          name: 'workflow-changed',
          event: { is_dirty: true },
        });
      }

      updateVariables();
    };

    // Pane ready handler
    const onPaneReady = (instance) => {
      console.log('[WorkflowBuilder] Pane ready, instance:', instance);
      // Store the instance for later use
      if (nodes.value.length > 0) {
        console.log('[WorkflowBuilder] Fitting view to nodes');
        nextTick(() => {
          instance.fitView({ padding: 0.2 });
        });
      }
    };

    // Keyboard handler for delete
    const onKeyDown = (event) => {
      if (isReadOnly.value) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const eid = entryNodeId.value;
        const selectedNodes = nodes.value.filter((n) => n.selected && n.id !== eid);
        const selectedEdges = edges.value.filter((e) => e.selected);

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

          nodes.value = nodes.value.filter((n) => !n.selected || n.id === eid);
          edges.value = edges.value.filter(
            (e) =>
              !e.selected &&
              !selectedNodeIds.has(e.source) &&
              !selectedNodeIds.has(e.target)
          );

          setSelectedNodeId('');
          setSelectedNodeData({});
          setIsDirty(true);

          emit('trigger-event', {
            name: 'workflow-changed',
            event: { is_dirty: true },
          });

          updateVariables();
        }
      }
    };

    // Watch for workflow metadata changes
    watch(
      () => props.content?.initialWorkflow,
      (newWorkflow) => {
        if (newWorkflow && typeof newWorkflow === 'object') {
          workflowMeta.value = { ...newWorkflow };
          updateVariables();
        }
      },
      { immediate: true, deep: true }
    );

    // Watch for initial data changes
    watch(
      () => [props.content?.initialNodes, props.content?.initialEdges],
      ([newNodes, newEdges]) => {
        isInitialLoad.value = true;

        const { nodes: vfNodes, edges: vfEdges } = dbToVueFlow(
          newNodes,
          newEdges
        );

        nodes.value = vfNodes;
        edges.value = vfEdges;

        setIsDirty(false);
        updateVariables();

        nextTick(() => {
          if (vueFlowRef.value && vfNodes.length > 0) {
            vueFlowRef.value.fitView({ padding: 0.2 });
          }
          setTimeout(() => {
            isInitialLoad.value = false;
          }, 100);
        });
      },
      { immediate: true, deep: true }
    );

    const autoEntryCreated = ref(false);

    // Auto-fetch all reference data when Supabase credentials become available
    const initializeDataFetch = async () => {
      if (!api.isReady.value) return;

      await api.fetchWorkflows();
      await api.fetchAllReferenceData();
    };

    watch(() => api.isReady.value, (ready) => {
      if (ready) {
        initializeDataFetch();
      }
    }, { immediate: true });

    onMounted(() => {
      setTimeout(() => {
        if (nodes.value.length === 0 && !isReadOnly.value && !autoEntryCreated.value) {
          autoEntryCreated.value = true;
          const newNode = addNode('condition', 250, 200, null, 'Entry Condition');
          if (newNode) {
            nodes.value = nodes.value.map(n => {
              if (n.id === newNode.id) {
                return { ...n, data: { ...n.data, showDeleteAction: false } };
              }
              return n;
            });
            setIsDirty(false);
            nextTick(() => {
              if (vueFlowRef.value) vueFlowRef.value.fitView({ padding: 0.2 });
              setTimeout(() => openConfigPanel(newNode.id), 100);
            });
          }
        }
      }, 300);
    });

    // Fetch node stats when workflow ID is available, poll every 30s
    let statsInterval = null;
    watch(
      () => workflowMeta.value?.id || props.content?.initialWorkflow?.id,
      (wfId) => {
        if (statsInterval) clearInterval(statsInterval);
        if (wfId && api.isReady.value) {
          setTimeout(() => fetchNodeStats(), 200);
          statsInterval = setInterval(() => fetchNodeStats(), 30000);
        }
      },
      { immediate: true }
    );

    onBeforeUnmount(() => {
      if (statsInterval) clearInterval(statsInterval);
    });

    // Watch nodes array and fit view
    watch(
      () => nodes.value.length,
      (newLength, oldLength) => {
        console.log('[WorkflowBuilder] Node count changed:', oldLength, '->', newLength);
        if (newLength > 0 && vueFlowRef.value) {
          nextTick(() => {
            console.log('[WorkflowBuilder] Triggering fitView');
            vueFlowRef.value.fitView({ padding: 0.2 });
          });
        }
      }
    );

    // Watch for readOnly changes
    watch(
      () => props.content?.readOnly,
      () => {
        // No specific action needed, computed handles it
      }
    );

    // Watch for color, action, and entry node changes to update existing nodes
    watch(
      () => [
        props.content?.conditionNodeColor,
        props.content?.messageNodeColor,
        props.content?.waitNodeColor,
        props.content?.apiNodeColor,
        props.content?.agentNodeColor,
        props.content?.showEditAction,
        props.content?.showDeleteAction,
        entryNodeId.value,
      ],
      () => {
        const eid = entryNodeId.value;
        nodes.value = nodes.value.map((node) => ({
          ...node,
          data: {
            ...node.data,
            color: getNodeColor(node.type),
            showEditAction: showEditAction.value,
            showDeleteAction: node.id === eid ? false : showDeleteAction.value,
            stats: nodeStatsMap.value[node.id] || node.data?.stats || null,
            onEdit: handleNodeEdit,
            onDelete: handleNodeDelete,
            onStatsClick: handleStatsClick,
          },
        }));
      },
      { deep: true }
    );

    // Expose actions
    expose({
      save,
      validate,
      clear,
      updateNodeConfig,
      openConfigPanel,
      closeConfigPanel,
      openStatusPanel,
      closeStatusPanel,
      showList: goBackToList,
      createWorkflow,
      editWorkflow: (args) => {
        const wfId = args?.workflowId;
        if (!wfId) return;
        const wf = workflowsData.value.find(w => w?.id === wfId);
        if (wf) openWorkflow(wf);
      },
      refreshData: () => {
        if (api.isReady.value) {
          api.fetchWorkflows();
          api.fetchAllReferenceData();
        }
      },
    });

    /* wwEditor:start */
    const isEditing = computed(() => props.wwEditorState?.isEditing);
    /* wwEditor:end */

    return {
      currentViewLocal,
      workflowsData,
      workflowsLoading,
      rootContainerStyle,
      openWorkflow,
      createWorkflow,
      goBackToList,
      handleWorkflowStatusToggle,
      canvasRef,
      vueFlowRef,
      nodes,
      edges,
      nodeGroups,
      customNodeTypes,
      defaultEdgeOptions,
      isReadOnly,
      rootStyle,
      canvasStyle,
      gridColorValue,
      getNodeColor,
      onDragStart,
      onDrop,
      onNodeClick,
      onConnect,
      onNodesChange,
      onEdgesChange,
      onKeyDown,
      onPaneReady,
      configPanelOpen,
      editingConfig,
      editingNodeType,
      editingNodeIdLocal,
      entryNodeId,
      isEditingEntry,
      nodeTypeLabels,
      nodeIconMap,
      collectionsData,
      channelsData,
      messageTemplatesData,
      audiencesData,
      agentsData,
      supabaseUrlData,
      supabaseAnonKeyData,
      authTokenData,
      configValidationErrorsList,
      handleConfigUpdate,
      markConfigChanged,
      saveConfigEdit,
      cancelConfigEdit,
      closeConfigPanel,
      workflowMeta,
      statusPanelOpen,
      pendingStatus,
      openStatusPanel,
      closeStatusPanel,
      saveStatus,
      handleNameChange,
      handleToolbarSave,
      handleExit,
      pendingRunMode,
      batchRunOnSave,
      batchConfirmOpen,
      batchMatchingCount,
      batchDispatching,
      toastMessage,
      handleBatchRun,
      confirmBatchDispatch,
      closeBatchConfirm,
      settingsPanelOpen,
      workflowConfigLocal,
      toggleSettingsPanel,
      closeSettingsPanel,
      handleWorkflowConfigUpdate,
      saveWorkflowSettings,
      userListOpen,
      userListNodeId,
      userListNodeName,
      closeUserList,
      /* wwEditor:start */
      isEditing,
      /* wwEditor:end */
    };
  },
};
</script>

<style scoped lang="scss">
@import 'polaris-weweb-styles';

.workflow-root {
  @include polaris-tokens;
  font-family: var(--p-font-family-sans);
  width: 100%;
  height: 100%;
  min-height: 500px;
  position: relative;
}

.workflow-builder {
  display: grid !important;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto 1fr;
  gap: 0;
  width: 100%;
  height: 100%;
  min-height: 500px;
  overflow: hidden;
  background: var(--p-color-bg-surface-secondary);
  position: relative;
}

// ============================================
// Toolbar
// ============================================
.toolbar {
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--p-space-400);
  height: 52px;
  background: var(--p-color-bg-surface);
  border-bottom: 1px solid var(--p-color-border);
  box-shadow: 0 1px 0 0 rgba(0, 0, 0, 0.04);
  z-index: 10;
}

.toolbar__left {
  display: flex;
  align-items: center;
  gap: var(--p-space-300);
  flex: 1;
  min-width: 0;
}

.toolbar__name-input {
  border: none;
  background: transparent;
  font-size: var(--p-font-size-325);
  font-weight: var(--p-font-weight-semibold);
  color: var(--p-color-text);
  padding: var(--p-space-100) var(--p-space-200);
  border-radius: var(--p-border-radius-200);
  outline: none;
  min-width: 120px;
  max-width: 300px;
  transition: background 0.1s ease;

  &::placeholder {
    color: var(--p-color-text-secondary);
    font-weight: var(--p-font-weight-regular);
  }

  &:hover {
    background: var(--p-color-bg-surface-hover);
  }

  &:focus {
    background: var(--p-color-bg-surface);
    box-shadow: 0 0 0 2px var(--p-color-border-focus);
  }
}

.toolbar__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: var(--p-font-size-275);
  font-weight: var(--p-font-weight-medium);
  white-space: nowrap;
  flex-shrink: 0;

  &--draft {
    background: var(--p-color-bg-surface-secondary);
    color: var(--p-color-text-secondary);
  }

  &--live {
    background: var(--p-color-bg-fill-success-secondary);
    color: var(--p-color-text-success);
  }
}

.toolbar__badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  .toolbar__badge--draft & {
    background: var(--p-color-icon-secondary);
  }

  .toolbar__badge--live & {
    background: var(--p-color-icon-success);
  }
}

.toolbar__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--p-border-radius-200);
  background: transparent;
  color: var(--p-color-text-secondary);
  cursor: pointer;
  transition: all 0.1s ease;

  &:hover { background: var(--p-color-bg-surface-hover); color: var(--p-color-text); }
  &--active { background: var(--p-color-bg-surface-selected); color: var(--p-color-text-brand); }
}

.toolbar__right {
  display: flex;
  align-items: center;
  gap: var(--p-space-200);
  flex-shrink: 0;
}

// Left panel — holds either the node palette or the config panel
.left-panel {
  grid-column: 1;
  grid-row: 2;
  padding: 0;
  background: var(--p-color-bg-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: var(--p-border-width-025) solid var(--p-color-border);
  width: 300px;
  transition: width 0.2s ease;

  &--config {
    width: 480px;
  }
}

// Node palette
.node-palette {
  display: flex;
  flex-direction: column;
  padding: var(--p-space-300) var(--p-space-300);
  height: 100%;
  overflow-y: auto;
  gap: var(--p-space-100);
}

.palette-heading {
  font-size: var(--p-font-size-350);
  font-weight: var(--p-font-weight-bold);
  color: var(--p-color-text);
  padding: var(--p-space-100) var(--p-space-200) var(--p-space-200);
}

.palette-group {
  &__label {
    font-size: var(--p-font-size-275);
    font-weight: var(--p-font-weight-semibold);
    color: var(--p-color-text-secondary);
    padding: var(--p-space-200) var(--p-space-200) var(--p-space-100);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
}

.palette-item {
  display: flex;
  align-items: center;
  gap: var(--p-space-300);
  padding: var(--p-space-200) var(--p-space-200);
  cursor: grab;
  transition: background 0.15s ease;
  border-radius: var(--p-border-radius-200);
  min-height: 48px;

  &:hover {
    background: var(--p-color-bg-surface-hover);

    .palette-item__chevron { opacity: 1; }
  }

  &:active {
    cursor: grabbing;
    background: var(--p-color-bg-surface-active);
  }

  &__icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
    border-radius: var(--p-border-radius-200);
    background: var(--icon-bg, var(--p-color-bg-fill-secondary));
    color: var(--icon-color, var(--p-color-text));
  }

  &__text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  &__label {
    font-size: var(--p-font-size-300);
    font-weight: var(--p-font-weight-semibold);
    color: var(--p-color-text);
    line-height: var(--p-font-line-height-300);
  }

  &__desc {
    font-size: var(--p-font-size-275);
    color: var(--p-color-text-secondary);
    line-height: var(--p-font-line-height-300);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__chevron {
    flex-shrink: 0;
    color: var(--p-color-icon-secondary);
    opacity: 0;
    transition: opacity 0.15s ease;
    align-items: center;
    padding: 0 var(--p-space-050);
  }
}

// Canvas container
.canvas-container {
  grid-column: 2;
  grid-row: 2;
  min-width: 300px;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: var(--p-color-bg-surface-secondary);
}

// ============================================
// Vue Flow specific styles - Shopify Flow design
// Using Polaris variables where possible
// ============================================

:deep(.vue-flow) {
  width: 100%;
  height: 100%;
}

:deep(.vue-flow__node) {
  padding: 0;
  border: none;
  background: transparent;
}

// Shopify Flow style nodes - with shadow and selection border
:deep(.flow-node) {
  background: #FFFFFF;
  border: 1px solid #E1E3E5;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  min-width: 180px;
  max-width: 280px;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    border-color: #C9CCCF;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06);
  }
}

// Selection state - rounded border frame like Shopify Flow
:deep(.flow-node.selected) {
  border: 2px solid #202223;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06);
}

// Show action toolbar ONLY when selected (not hover)
:deep(.flow-node.selected .node-actions-toolbar) {
  opacity: 1;
  pointer-events: auto;
}

// Node body content - using Polaris inline layout
:deep(.node-body) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-space-300);
  padding: var(--p-space-400);
}

:deep(.node-label-group) {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

:deep(.node-type-subtitle) {
  font-size: 10px;
  font-weight: var(--p-font-weight-semibold);
  color: var(--p-color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1;
}

:deep(.node-label) {
  font-size: var(--p-font-size-325);
  font-weight: var(--p-font-weight-semibold);
  color: var(--p-color-text);
  line-height: var(--p-font-line-height-400);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// Icon badge (positioned on right like Shopify Flow)
:deep(.node-icon-badge) {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--badge-color, var(--p-color-bg-fill-brand)) 15%, white);
  border-radius: var(--p-border-radius-200);
  font-size: 16px;
  flex-shrink: 0;
}

// Node actions toolbar (appears on hover) - using Polaris card style
:deep(.node-actions-toolbar) {
  position: absolute;
  top: -40px;
  right: 0;
  display: flex;
  gap: var(--p-space-100);
  background: var(--p-color-bg-surface);
  border: var(--p-border-width-025) solid var(--p-color-border);
  border-radius: var(--p-border-radius-200);
  padding: var(--p-space-100);
  box-shadow: var(--p-shadow-200);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 10;
}

// Action buttons - using Polaris button plain style as base
:deep(.node-action-btn) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--p-border-radius-100);
  background: transparent;
  color: var(--p-color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--p-color-bg-surface-hover);
    color: var(--p-color-text);
  }
  
  svg {
    flex-shrink: 0;
  }
}

:deep(.node-action-edit:hover) {
  background: var(--p-color-bg-fill-info-secondary);
  color: var(--p-color-text-info);
}

:deep(.node-action-delete:hover) {
  background: var(--p-color-bg-fill-critical-secondary);
  color: var(--p-color-text-critical);
}

// Node stats footer
:deep(.node-stats) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 16px;
  border-top: 1px solid #F1F1F1;
  cursor: pointer;
  transition: background 0.1s ease;
  justify-content: center;

  &:hover {
    background: #F6F6F7;
  }
}

:deep(.node-stats__item) {
  font-size: 12px;
  color: #8C9196;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 2px;
}

:deep(.node-stats__item--waiting) {
  color: #1E40AF;
}

// Handle styles - left/right positioning
:deep(.flow-handle) {
  width: 10px !important;
  height: 10px !important;
  background: #FFFFFF !important;
  border: 2px solid #C9CCCF !important;
  border-radius: 50% !important;
  transition: all 0.15s ease;

  &:hover {
    background: #2C6ECB !important;
    border-color: #2C6ECB !important;
    transform: scale(1.3);
  }
}

:deep(.flow-handle-left) {
  left: -6px !important;
}

:deep(.flow-handle-right) {
  right: -6px !important;
}

:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  background: #FFFFFF;
  border: 2px solid #C9CCCF;
  transition: all 0.15s ease;

  &:hover {
    background: #2C6ECB;
    border-color: #2C6ECB;
    transform: scale(1.3);
  }
}

:deep(.vue-flow__handle-left) {
  left: -6px;
}

:deep(.vue-flow__handle-right) {
  right: -6px;
}

// Edge styles - very light, smooth bezier curve (like Shopify Flow)
:deep(.vue-flow__edge-path) {
  stroke: #C4C4C4 !important;
  stroke-width: 1 !important;
  stroke-dasharray: 4 3 !important;
  stroke-linecap: round !important;
  fill: none !important;
}

// Animated flow effect (very subtle)
:deep(.vue-flow__edge.animated .vue-flow__edge-path) {
  animation: flow-animation 2.5s linear infinite;
}

@keyframes flow-animation {
  from {
    stroke-dashoffset: 14;
  }
  to {
    stroke-dashoffset: 0;
  }
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #2C6ECB !important;
  stroke-width: 1.5 !important;
}

// Arrow marker styling - very light
:deep(.vue-flow__arrowhead) {
  fill: #C4C4C4;
}

:deep(.vue-flow__edge.selected .vue-flow__arrowhead) {
  fill: #2C6ECB;
}

:deep(.react-flow__arrowhead polyline),
:deep(.vue-flow__arrowhead polyline) {
  stroke: #C4C4C4;
  fill: #C4C4C4;
}

// Edge labels
:deep(.vue-flow__edge-text) {
  font-size: 11px;
  fill: #8C9196;
  font-weight: 500;
}

:deep(.vue-flow__edge-textbg) {
  fill: #F6F6F7;
  rx: 4;
  ry: 4;
}

// Controls styling - using Polaris card style
:deep(.vue-flow__controls) {
  box-shadow: var(--p-shadow-200);
  border-radius: var(--p-border-radius-200);
  overflow: hidden;
  border: var(--p-border-width-025) solid var(--p-color-border);
}

:deep(.vue-flow__controls-button) {
  background: var(--p-color-bg-surface);
  border: none;
  width: 32px;
  height: 32px;
  color: var(--p-color-text-secondary);

  &:hover {
    background: var(--p-color-bg-surface-hover);
    color: var(--p-color-text);
  }
}

// Background pattern
:deep(.vue-flow__background) {
  background: var(--p-color-bg-surface-secondary);
}

// ============================================
// Config Panel - fills left panel slot
// ============================================
.config-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--p-color-bg);
  font-family: var(--p-font-family-sans);
  overflow: hidden;
}

.config-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--p-color-bg-surface);
  border-bottom: 1px solid var(--p-color-border);
  flex-shrink: 0;
}

.config-panel__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.config-panel__icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-color-bg-fill);
  border-radius: 8px;
  font-size: 18px;
  flex-shrink: 0;

  &--settings { background: #F3F4F6; }
  &--entry { background: #E0E7FF; }
  &--condition { background: #DBEAFE; }
  &--message { background: #D1FAE5; }
  &--wait { background: #FEF3C7; }
  &--api { background: #EDE9FE; }
  &--action { background: #FCE7F3; }
  &--agent { background: #CFFAFE; }
}

.config-panel__header-info {
  flex: 1;
  min-width: 0;
}

.config-panel__type-label {
  font-size: 12px;
  color: var(--p-color-text-secondary);
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.config-panel__title-input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  outline: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--p-color-text);
  line-height: 1.4;

  &:focus {
    outline: none;
  }
}

.config-panel__title-static {
  font-size: 15px;
  font-weight: 600;
  color: var(--p-color-text);
  line-height: 1.4;
}

.config-panel__close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--p-color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover {
    background: var(--p-color-bg-surface-hover);
    color: var(--p-color-text);
  }
}

.config-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--p-space-400);
  background: var(--p-color-bg-surface-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--p-space-400);
}


.config-panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--p-space-200);
  padding: var(--p-space-400);
  background: var(--p-color-bg-surface);
  border-top: var(--p-border-width-025) solid var(--p-color-border);
  flex-shrink: 0;
}

// ============================================
// Status Panel - right overlay
// ============================================
.status-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  z-index: 25;
  display: flex;
  flex-direction: column;
  background: var(--p-color-bg-surface);
  border-left: var(--p-border-width-025) solid var(--p-color-border);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.08);
}

.status-panel__content {
  flex: 1;
  padding: var(--p-space-500);
  overflow-y: auto;
}

.status-panel__footer {
  display: flex;
  gap: var(--p-space-200);
  padding: var(--p-space-400);
  border-top: var(--p-border-width-025) solid var(--p-color-border);
}

// Status panel form field styles (radio group + batch checkbox wrapper)
.polaris-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-200);

  &__label {
    @include polaris-label;
  }

  &__required {
    color: var(--p-color-text-critical);
  }

  &__help {
    @include polaris-help-text;
    margin: 0;
  }
}


// ============================================
// Batch Run + Radio/Checkbox + Toast
// ============================================
.radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--p-space-200);
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: var(--p-space-200);
  cursor: pointer;
  padding: var(--p-space-200);
  border-radius: var(--p-border-radius-200);
  transition: background 0.1s;

  &:hover { background: var(--p-color-bg-surface-hover); }

  input[type="radio"] {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    cursor: pointer;
    flex-shrink: 0;
    accent-color: var(--p-color-bg-fill-brand, #2C6ECB);
  }

  &__label {
    display: block;
    font-size: var(--p-font-size-300);
    font-weight: var(--p-font-weight-medium);
    color: var(--p-color-text);
  }

  &__help {
    display: block;
    font-size: var(--p-font-size-275);
    color: var(--p-color-text-secondary);
    margin-top: 1px;
  }
}

.batch-checkbox {
  display: flex;
  align-items: center;
  gap: var(--p-space-200);
  cursor: pointer;
  font-size: var(--p-font-size-300);
  color: var(--p-color-text);

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--p-color-bg-fill-brand, #2C6ECB);
  }
}

.batch-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.batch-dialog {
  background: var(--p-color-bg-surface);
  border-radius: var(--p-border-radius-300);
  box-shadow: var(--p-shadow-600);
  padding: var(--p-space-500);
  max-width: 440px;
  width: 90%;

  &__message {
    font-size: var(--p-font-size-325);
    color: var(--p-color-text);
    margin: 0 0 var(--p-space-400);
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--p-space-200);
  }
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #303030;
  color: #FFFFFF;
  padding: 10px 20px;
  border-radius: var(--p-border-radius-200);
  font-size: var(--p-font-size-300);
  box-shadow: var(--p-shadow-400);
  z-index: 300;
  cursor: pointer;
  animation: toast-in 0.2s ease;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

// Responsive
@media (max-width: 768px) {
  .left-panel {
    display: none;
  }
  
  .workflow-builder {
    grid-template-columns: 1fr;
  }
}
</style>

