<template>
  <div class="workflow-builder" :style="rootStyle">
    <!-- Sidebar Node Palette -->
    <div
      v-if="!isReadOnly"
      class="sidebar"
      :style="sidebarStyle"
    >
      <div class="node-palette">
        <div class="palette-heading">Actions</div>
        <div v-for="group in nodeGroups" :key="group.label" class="palette-group">
          <div class="palette-group__label">{{ group.label }}</div>
          <div
            v-for="nodeType in group.nodes"
            :key="nodeType.type"
            class="palette-item"
            draggable="true"
            @dragstart="onDragStart($event, nodeType.type)"
          >
            <span class="palette-item__icon" :style="{ color: getNodeColor(nodeType.type) }">{{ nodeType.icon }}</span>
            <span class="palette-item__label">{{ nodeType.label }}</span>
            <span class="palette-item__grip">
              <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
                <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
                <circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/>
                <circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/>
              </svg>
            </span>
          </div>
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

    <!-- Node Config Panel -->
    <div
      v-if="configPanelOpen && !isReadOnly"
      class="config-panel"
      :style="configPanelStyle"
    >
      <div class="config-panel__header">
        <div class="config-panel__header-left">
          <span class="config-panel__icon" :class="`config-panel__icon--${editingNodeType}`">
            {{ nodeIconMap[editingNodeType] || '⚙️' }}
          </span>
          <div class="config-panel__header-info">
            <span class="config-panel__type-label">{{ nodeTypeLabels[editingNodeType] || 'Node' }}</span>
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
        <ConditionConfig
          v-if="editingNodeType === 'condition'"
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
          :channels="channelsData"
          @update="handleConfigUpdate"
        />
        <AgentConfig
          v-else-if="editingNodeType === 'agent'"
          :config="editingConfig"
          @update="handleConfigUpdate"
        />

        <div v-if="configValidationErrorsList.length > 0" class="config-panel__errors">
          <ul>
            <li v-for="(error, idx) in configValidationErrorsList" :key="idx">{{ error }}</li>
          </ul>
        </div>
      </div>

      <div class="config-panel__footer">
        <button class="config-panel__btn config-panel__btn--cancel" @click="cancelConfigEdit">Cancel</button>
        <button class="config-panel__btn config-panel__btn--save" @click="saveConfigEdit">Save</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, h, markRaw, nextTick } from 'vue';
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

// Helper to create node action toolbar
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

// Node icon mapping
const nodeIconMap = {
  condition: '🔀',
  message: '✉️',
  wait: '⏱️',
  api: '🔌',
  action: '⚡',
  trigger: '🎯',
  agent: '🤖',
  test: '🧪',
};

const nodeTypeLabels = {
  condition: 'Condition',
  message: 'Message',
  wait: 'Wait',
  api: 'API Call',
  action: 'Action',
  trigger: 'Trigger',
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
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Condition'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#3B82F6' } }, '🔀'),
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
        ]
      );
  },
};

// Trigger node (for your database "trigger" type) - only has output (right side)
const TriggerNode = {
  name: 'TriggerNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'trigger-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#6366F1' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Trigger'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#6366F1' } }, '🎯'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
          h(Handle, { type: 'source', position: Position.Right, id: 'default', class: 'flow-handle flow-handle-right', style: { top: '70%' } }),
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
    const draggedType = ref(null);
    const isInitialLoad = ref(true);

    // Custom node types registration
    const customNodeTypes = {
      condition: markRaw(ConditionNode),
      message: markRaw(MessageNode),
      wait: markRaw(WaitNode),
      api: markRaw(ApiNode),
      action: markRaw(ActionNode),
      trigger: markRaw(TriggerNode),
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

    // Node palette grouped by category
    const nodeGroups = [
      {
        label: 'Messages',
        nodes: [
          { type: 'message', label: 'Message', icon: '✉️' },
        ],
      },
      {
        label: 'Actions',
        nodes: [
          { type: 'action', label: 'Action', icon: '⚡' },
          { type: 'api', label: 'API call', icon: '🔌' },
        ],
      },
      {
        label: 'Logic',
        nodes: [
          { type: 'wait', label: 'Time delay', icon: '⏱️' },
          { type: 'condition', label: 'Conditional split', icon: '🔀' },
          { type: 'agent', label: 'AI Agent', icon: '🤖' },
        ],
      },
    ];

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

    // Config panel data sources from props
    const collectionsData = computed(() => props.content?.collections || []);
    const channelsData = computed(() => props.content?.channels || [
      { value: 'email', label: 'Email' },
      { value: 'sms', label: 'SMS' },
      { value: 'line', label: 'LINE' },
      { value: 'push', label: 'Push Notification' },
    ]);
    const messageTemplatesData = computed(() => props.content?.messageTemplates || []);
    const configPanelWidth = computed(() => props.content?.configPanelWidth || '360px');
    const configPanelStyle = computed(() => ({ width: configPanelWidth.value }));
    const configValidationErrorsList = computed(() => configValidationErrors.value || []);

    const deepClone = (obj) => {
      if (obj === null || obj === undefined) return obj;
      return JSON.parse(JSON.stringify(obj));
    };

    // Config panel handlers
    const openConfigPanel = (nodeId) => {
      const node = nodes.value.find(n => n.id === nodeId);
      if (!node) return;

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

      if (nodeType === 'condition') {
        const groups = config?.groups || [];
        if (groups.length === 0) errors.push('At least one condition group is required');
        groups.forEach((group, gIdx) => {
          if (!group?.collection) errors.push(`Group ${gIdx + 1}: Collection is required`);
          const conditions = group?.conditions || [];
          if (conditions.length === 0) errors.push(`Group ${gIdx + 1}: At least one condition is required`);
          conditions.forEach((condition, cIdx) => {
            if (!condition?.field) errors.push(`Group ${gIdx + 1}, Condition ${cIdx + 1}: Field is required`);
          });
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
        if (config?.action_type === 'award_points' && (!config?.amount || config.amount <= 0)) errors.push('Amount must be greater than 0');
        if (config?.action_type === 'assign_tag' && !config?.tag_id) errors.push('Tag ID is required');
        if (config?.action_type === 'send_message') {
          if (!config?.channel) errors.push('Channel is required');
          if (!config?.message) errors.push('Message content is required');
        }
      } else if (nodeType === 'agent') {
        if (!config?.campaign_objective) errors.push('Campaign objective is required');
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

    // Computed styles
    const isReadOnly = computed(() => props.content?.readOnly === true);

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
        trigger: props.content?.triggerNodeColor || '#6366F1',
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
    const getDefaultNodeData = (type) => {
      const defaults = {
        trigger: {
          label: 'New Trigger',
          event: null,
        },
        condition: {
          label: 'New Condition',
          groups_operator: 'AND',
          groups: [],
        },
        action: {
          label: 'New Action',
          action_type: null,
          message: '',
        },
        message: {
          label: 'New Message',
          channel: null,
          template_id: null,
          subject: '',
          content: '',
          json_content: null,
        },
        wait: {
          label: 'New Wait',
          duration: 1,
          unit: 'days',
        },
        api: {
          label: 'New API Call',
          method: 'POST',
          url: '',
          headers: {},
          body: '',
          timeout_seconds: 30,
          retry_count: 2,
        },
        agent: {
          label: 'New Agent',
          campaign_objective: '',
          use_groq: true,
        },
      };
      return defaults[type] || { label: `New ${type}` };
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
      const vfNodes = (dbNodes || []).map((node) => {
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
          },
        };
      });

      const vfEdges = (dbEdges || []).map((edge) => ({
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
        // Extract clean config without internal fields
        const cleanData = { ...node?.data };
        delete cleanData.color;
        delete cleanData.showEditAction;
        delete cleanData.showDeleteAction;
        delete cleanData.onEdit;
        delete cleanData.onDelete;
        
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

      // Set full workflow data for API
      setWorkflowData({
        p_workflow: workflowMeta.value || {},
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

    // Save action - returns full payload for upsert API
    const save = () => {
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

      // Full payload for API
      const payload = {
        p_workflow: workflowMeta.value || {},
        p_nodes,
        p_edges,
      };

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
    const addNode = (type, x, y) => {
      const defaultData = getDefaultNodeData(type);
      
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
    const onDragStart = (event, type) => {
      if (isReadOnly.value) return;
      draggedType.value = type;
      event.dataTransfer.setData('application/vueflow', type);
      event.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = (event) => {
      event.preventDefault();
      if (isReadOnly.value) return;

      const type = event.dataTransfer.getData('application/vueflow');
      console.log('[WorkflowBuilder] Drop event - type:', type);
      if (!type) {
        console.log('[WorkflowBuilder] No type in dataTransfer, using draggedType:', draggedType.value);
      }
      
      const nodeType = type || draggedType.value;
      if (!nodeType) return;

      const bounds = canvasRef.value?.getBoundingClientRect();
      if (!bounds) {
        console.log('[WorkflowBuilder] No canvas bounds');
        return;
      }

      // Calculate position relative to canvas
      let x = event.clientX - bounds.left;
      let y = event.clientY - bounds.top;

      // Get the Vue Flow instance to access viewport
      const vfInstance = vueFlowRef.value;
      console.log('[WorkflowBuilder] VueFlow instance:', vfInstance);
      
      if (vfInstance?.viewport) {
        const { viewport } = vfInstance;
        console.log('[WorkflowBuilder] Viewport:', viewport);
        x = (x - viewport.x) / viewport.zoom;
        y = (y - viewport.y) / viewport.zoom;
      }

      console.log('[WorkflowBuilder] Adding node at:', { x, y, type: nodeType });
      const newNode = addNode(nodeType, x, y);
      console.log('[WorkflowBuilder] New node created:', newNode);
      console.log('[WorkflowBuilder] Total nodes:', nodes.value.length, nodes.value);
      
      draggedType.value = null;
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
        const selectedNodes = nodes.value.filter((n) => n.selected);
        const selectedEdges = edges.value.filter((e) => e.selected);

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

          nodes.value = nodes.value.filter((n) => !n.selected);
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
        console.log('[WorkflowBuilder] Initial data changed:', { newNodes, newEdges });
        isInitialLoad.value = true;

        const { nodes: vfNodes, edges: vfEdges } = dbToVueFlow(
          newNodes,
          newEdges
        );

        console.log('[WorkflowBuilder] Converted to VueFlow format:', { vfNodes, vfEdges });
        
        nodes.value = vfNodes;
        edges.value = vfEdges;

        console.log('[WorkflowBuilder] nodes.value is now:', nodes.value);

        setIsDirty(false);
        updateVariables();

        // Fit view after nodes are set
        nextTick(() => {
          if (vueFlowRef.value && vfNodes.length > 0) {
            console.log('[WorkflowBuilder] Fitting view after initial load');
            vueFlowRef.value.fitView({ padding: 0.2 });
          }
          setTimeout(() => {
            isInitialLoad.value = false;
          }, 100);
        });
      },
      { immediate: true, deep: true }
    );

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

    // Watch for color and action changes to update existing nodes
    watch(
      () => [
        props.content?.conditionNodeColor,
        props.content?.messageNodeColor,
        props.content?.waitNodeColor,
        props.content?.apiNodeColor,
        props.content?.agentNodeColor,
        props.content?.showEditAction,
        props.content?.showDeleteAction,
      ],
      () => {
        nodes.value = nodes.value.map((node) => ({
          ...node,
          data: {
            ...node.data,
            color: getNodeColor(node.type),
            showEditAction: showEditAction.value,
            showDeleteAction: showDeleteAction.value,
            onEdit: handleNodeEdit,
            onDelete: handleNodeDelete,
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
    });

    /* wwEditor:start */
    const isEditing = computed(() => props.wwEditorState?.isEditing);
    /* wwEditor:end */

    return {
      canvasRef,
      vueFlowRef,
      nodes,
      edges,
      nodeGroups,
      customNodeTypes,
      defaultEdgeOptions,
      isReadOnly,
      rootStyle,
      sidebarStyle,
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
      configPanelStyle,
      editingConfig,
      editingNodeType,
      editingNodeIdLocal,
      nodeTypeLabels,
      nodeIconMap,
      collectionsData,
      channelsData,
      messageTemplatesData,
      configValidationErrorsList,
      handleConfigUpdate,
      markConfigChanged,
      saveConfigEdit,
      cancelConfigEdit,
      closeConfigPanel,
      /* wwEditor:start */
      isEditing,
      /* wwEditor:end */
    };
  },
};
</script>

<style scoped lang="scss">
@import 'polaris-weweb-styles';

// Root element with Polaris tokens
.workflow-builder {
  @include polaris-tokens;
  display: grid !important;
  grid-template-columns: auto 1fr;
  gap: 0;
  width: 100%;
  height: 100%;
  min-height: 500px;
  overflow: hidden;
  font-family: var(--p-font-family-sans);
  background: var(--p-color-bg-surface-secondary);
  position: relative;
}

// Sidebar
.sidebar {
  grid-column: 1;
  padding: 0;
  background: var(--p-color-bg-surface);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-right: var(--p-border-width-025) solid var(--p-color-border);
  width: 240px;
}

// Node palette
.node-palette {
  display: flex;
  flex-direction: column;
  padding: var(--p-space-400) 0;
}

.palette-heading {
  font-size: var(--p-font-size-350);
  font-weight: var(--p-font-weight-bold);
  color: var(--p-color-text);
  padding: 0 var(--p-space-400) var(--p-space-200);
}

.palette-group {
  &__label {
    font-size: var(--p-font-size-275);
    font-weight: var(--p-font-weight-medium);
    color: var(--p-color-text-secondary);
    padding: var(--p-space-300) var(--p-space-400) var(--p-space-100);
    text-transform: none;
    letter-spacing: 0;
  }
}

.palette-item {
  display: flex;
  align-items: center;
  gap: var(--p-space-300);
  padding: var(--p-space-200) var(--p-space-400);
  cursor: grab;
  transition: background 0.1s ease;
  border-radius: 0;
  min-height: 40px;

  &:hover {
    background: var(--p-color-bg-surface-hover);

    .palette-item__grip {
      opacity: 1;
    }
  }

  &:active {
    cursor: grabbing;
    background: var(--p-color-bg-surface-active);
  }

  &__icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  &__label {
    flex: 1;
    font-size: var(--p-font-size-325);
    font-weight: var(--p-font-weight-regular);
    color: var(--p-color-text);
    line-height: var(--p-font-line-height-400);
  }

  &__grip {
    flex-shrink: 0;
    color: var(--p-color-icon-secondary);
    opacity: 0;
    transition: opacity 0.1s ease;
    display: flex;
    align-items: center;
    padding: 0 var(--p-space-050);
  }
}

// Canvas container
.canvas-container {
  grid-column: 2;
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
  transform: translateX(-50%) translateY(0);
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

:deep(.node-label) {
  font-size: var(--p-font-size-325);
  font-weight: var(--p-font-weight-semibold);
  color: var(--p-color-text);
  line-height: var(--p-font-line-height-400);
  flex: 1;
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
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  display: flex;
  gap: var(--p-space-100);
  background: var(--p-color-bg-surface);
  border: var(--p-border-width-025) solid var(--p-color-border);
  border-radius: var(--p-border-radius-200);
  padding: var(--p-space-100);
  box-shadow: var(--p-shadow-400);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
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
// Config Panel - right sidebar overlay
// ============================================
.config-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: var(--p-color-bg);
  border-left: 1px solid #E1E3E5;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.08);
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
  padding: 16px;
}

.config-panel__errors {
  margin-top: 12px;
  padding: 12px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  color: #991B1B;
  font-size: 13px;

  ul {
    margin: 0;
    padding-left: 16px;
    list-style: disc;
  }

  li + li {
    margin-top: 4px;
  }
}

.config-panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  background: var(--p-color-bg-surface);
  border-top: 1px solid var(--p-color-border);
  flex-shrink: 0;
}

.config-panel__btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid var(--p-color-border);

  &--cancel {
    background: var(--p-color-bg-surface);
    color: var(--p-color-text);

    &:hover {
      background: var(--p-color-bg-surface-hover);
    }
  }

  &--save {
    background: #303030;
    color: #FFFFFF;
    border-color: #303030;

    &:hover {
      background: #1A1A1A;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// Responsive
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  
  .workflow-builder {
    grid-template-columns: 1fr;
  }

  .config-panel {
    width: 100% !important;
  }
}
</style>

