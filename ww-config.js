export default {
  editor: {
    label: {
      en: 'Workflow Builder',
    },
    icon: 'workflow',
    customStylePropertiesOrder: [
      'sidebarWidth',
      'sidebarBackground',
      'canvasBackground',
      'gridColor',
      'configPanelWidth',
      'conditionNodeColor',
      'messageNodeColor',
      'waitNodeColor',
      'apiNodeColor',
      'agentNodeColor',
    ],
    customSettingsPropertiesOrder: [
      'supabaseUrl',
      'supabaseAnonKey',
      'authToken',
      'readOnly',
      'showEditAction',
      'showDeleteAction',
      'workflows',
      'initialWorkflow',
      'initialNodes',
      'initialEdges',
      'collections',
      'audiences',
      'agents',
      'channels',
      'messageTemplates',
    ],
  },
  actions: [
    {
      name: 'save',
      label: { en: 'Save Workflow' },
      action: 'save',
      /* wwEditor:start */
      actionDescription: {
        en: 'Validates and returns full workflow payload {p_workflow, p_nodes, p_edges} for upsert API',
      },
      /* wwEditor:end */
    },
    {
      name: 'validate',
      label: { en: 'Validate Workflow' },
      action: 'validate',
      /* wwEditor:start */
      actionDescription: {
        en: 'Returns {valid, errors} validation result',
      },
      /* wwEditor:end */
    },
    {
      name: 'clear',
      label: { en: 'Clear Canvas' },
      action: 'clear',
      /* wwEditor:start */
      actionDescription: {
        en: 'Clears all nodes and edges from canvas',
      },
      /* wwEditor:end */
    },
    {
      name: 'updateNodeConfig',
      label: { en: 'Update Node Config' },
      action: 'updateNodeConfig',
      args: [
        {
          name: 'nodeId',
          label: { en: 'Node ID' },
          type: 'Text',
          required: true,
        },
        {
          name: 'config',
          label: { en: 'Config Data' },
          type: 'Object',
          required: true,
        },
      ],
      /* wwEditor:start */
      actionDescription: {
        en: 'Updates the config data for a specific node by ID',
      },
      /* wwEditor:end */
    },
    {
      name: 'openConfigPanel',
      label: { en: 'Open Config Panel' },
      action: 'openConfigPanel',
      args: [
        {
          name: 'nodeId',
          label: { en: 'Node ID' },
          type: 'Text',
          required: true,
        },
      ],
      /* wwEditor:start */
      actionDescription: {
        en: 'Opens the config panel for a specific node by ID',
      },
      /* wwEditor:end */
    },
    {
      name: 'closeConfigPanel',
      label: { en: 'Close Config Panel' },
      action: 'closeConfigPanel',
      /* wwEditor:start */
      actionDescription: {
        en: 'Closes the config panel and discards unsaved changes',
      },
      /* wwEditor:end */
    },
    {
      name: 'openStatusPanel',
      label: { en: 'Open Status Panel' },
      action: 'openStatusPanel',
      /* wwEditor:start */
      actionDescription: {
        en: 'Opens the status panel to change workflow status (Draft/Live)',
      },
      /* wwEditor:end */
    },
    {
      name: 'closeStatusPanel',
      label: { en: 'Close Status Panel' },
      action: 'closeStatusPanel',
      /* wwEditor:start */
      actionDescription: {
        en: 'Closes the status panel',
      },
      /* wwEditor:end */
    },
    {
      name: 'showList',
      label: { en: 'Show Workflow List' },
      action: 'showList',
      /* wwEditor:start */
      actionDescription: {
        en: 'Navigates back to the workflow list view',
      },
      /* wwEditor:end */
    },
    {
      name: 'createWorkflow',
      label: { en: 'Create New Workflow' },
      action: 'createWorkflow',
      /* wwEditor:start */
      actionDescription: {
        en: 'Opens the builder with a blank workflow',
      },
      /* wwEditor:end */
    },
    {
      name: 'editWorkflow',
      label: { en: 'Edit Workflow' },
      action: 'editWorkflow',
      args: [
        {
          name: 'workflowId',
          label: { en: 'Workflow ID' },
          type: 'Text',
          required: true,
        },
      ],
      /* wwEditor:start */
      actionDescription: {
        en: 'Opens the builder for an existing workflow by ID',
      },
      /* wwEditor:end */
    },
    {
      name: 'refreshData',
      label: { en: 'Refresh All Data' },
      action: 'refreshData',
      /* wwEditor:start */
      actionDescription: {
        en: 'Re-fetches workflows, collections, audiences, and agents from Supabase',
      },
      /* wwEditor:end */
    },
  ],
  triggerEvents: [
    {
      name: 'workflow-saved',
      label: { en: 'On Workflow Saved' },
      event: { p_workflow: {}, p_nodes: [], p_edges: [] },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ p_workflow: {id: "test"}, p_nodes: [{id: "n1", node_type: "message"}], p_edges: [] })',
      /* wwEditor:end */
    },
    {
      name: 'node-selected',
      label: { en: 'On Node Selected' },
      event: { id: '', type: '', position: { x: 0, y: 0 }, data: {} },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ id: "node-123", type: "message", position: { x: 100, y: 100 }, data: { label: "Test Node" } })',
      /* wwEditor:end */
    },
    {
      name: 'node-edit',
      label: { en: 'On Node Edit' },
      event: { id: '', type: '', position: { x: 0, y: 0 }, data: {} },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ id: "node-123", type: "condition", position: { x: 100, y: 100 }, data: { label: "Edit Node" } })',
      /* wwEditor:end */
    },
    {
      name: 'node-deleted',
      label: { en: 'On Node Deleted' },
      event: { id: '', type: '', position: { x: 0, y: 0 }, data: {} },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ id: "node-123", type: "message", position: { x: 100, y: 100 }, data: { label: "Deleted Node" } })',
      /* wwEditor:end */
    },
    {
      name: 'workflow-changed',
      label: { en: 'On Workflow Changed' },
      event: { is_dirty: true },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ is_dirty: true })',
      /* wwEditor:end */
    },
    {
      name: 'validation-failed',
      label: { en: 'On Validation Failed' },
      event: { errors: [] },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ errors: ["No nodes in workflow"] })',
      /* wwEditor:end */
    },
    {
      name: 'config-panel-opened',
      label: { en: 'On Config Panel Opened' },
      event: { nodeId: '', nodeType: '' },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ nodeId: "node-123", nodeType: "condition" })',
      /* wwEditor:end */
    },
    {
      name: 'config-panel-closed',
      label: { en: 'On Config Panel Closed' },
      event: {},
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({})',
      /* wwEditor:end */
    },
    {
      name: 'node-config-saved',
      label: { en: 'On Node Config Saved' },
      event: { nodeId: '', config: {} },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ nodeId: "node-123", config: { label: "Configured Node" } })',
      /* wwEditor:end */
    },
    {
      name: 'status-updated',
      label: { en: 'On Status Updated' },
      event: { is_active: false },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ is_active: true })',
      /* wwEditor:end */
    },
    {
      name: 'exit',
      label: { en: 'On Exit' },
      event: { is_dirty: false },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ is_dirty: false })',
      /* wwEditor:end */
    },
    {
      name: 'view-changed',
      label: { en: 'On View Changed' },
      event: { view: 'list', mode: '', workflowId: '' },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ view: "detail", mode: "edit", workflowId: "wf-123" })',
      /* wwEditor:end */
    },
    {
      name: 'workflow-status-toggled',
      label: { en: 'On Workflow Status Toggled' },
      event: { workflowId: '', is_active: false },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ workflowId: "wf-123", is_active: true })',
      /* wwEditor:end */
    },
    {
      name: 'create-workflow',
      label: { en: 'On Create Workflow' },
      event: {},
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({})',
      /* wwEditor:end */
    },
  ],
  properties: {
    // ─── Data Binding ────────────────────────────────────────────
    workflows: {
      label: { en: 'Workflows List (auto-fetched)' },
      type: 'Info',
      section: 'settings',
      options: {
        text: { en: 'Auto-fetched from Supabase. Optional override if you want to provide your own list.' },
      },
      bindable: true,
      defaultValue: [],
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Auto-fetched from amp_workflow table. Optional override: [{id, name, description, is_active, ...}]',
      },
      propertyHelp:
        'Auto-fetched from Supabase when credentials are provided. Bind here only to override the auto-fetched list.',
      /* wwEditor:end */
    },
    initialWorkflow: {
      label: { en: 'Workflow Data (auto-fetched)' },
      type: 'Object',
      section: 'settings',
      bindable: true,
      defaultValue: {},
      /* wwEditor:start */
      bindingValidation: {
        type: 'object',
        tooltip: 'Auto-loaded via bff_get_amp_workflow_full when selecting a workflow. Optional override.',
      },
      propertyHelp:
        'Auto-fetched when a workflow is selected from the list. Bind here only to override or pre-load a specific workflow.',
      /* wwEditor:end */
    },
    initialNodes: {
      label: { en: 'Initial Nodes (auto-fetched)' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [],
      options: {
        expandable: true,
        getItemLabel(item) {
          return item?.node_name || item?.node_config?.label || item?.node_type || 'Node';
        },
        item: {
          type: 'Object',
          defaultValue: {
            id: '',
            node_type: 'message',
            position_x: 100,
            position_y: 100,
            node_config: { label: 'New Node' },
          },
          options: {
            item: {
              id: {
                label: { en: 'ID' },
                type: 'Text',
                options: { placeholder: 'Auto-generated if empty' },
              },
              node_type: {
                label: { en: 'Node Type' },
                type: 'TextSelect',
                options: {
                  options: [
                    { value: 'condition', label: 'Condition' },
                    { value: 'message', label: 'Message' },
                    { value: 'wait', label: 'Wait' },
                    { value: 'api', label: 'API Call' },
                    { value: 'action', label: 'Action' },
                    { value: 'agent', label: 'Agent' },
                  ],
                },
                defaultValue: 'message',
              },
              position_x: {
                label: { en: 'Position X' },
                type: 'Number',
                options: { min: 0, max: 5000, step: 10 },
                defaultValue: 100,
              },
              position_y: {
                label: { en: 'Position Y' },
                type: 'Number',
                options: { min: 0, max: 5000, step: 10 },
                defaultValue: 100,
              },
              node_config: {
                label: { en: 'Config' },
                type: 'Object',
                defaultValue: { label: 'New Node' },
                options: {
                  item: {
                    label: {
                      label: { en: 'Label' },
                      type: 'Text',
                      defaultValue: 'New Node',
                    },
                  },
                },
              },
            },
          },
        },
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Auto-loaded via bff_get_amp_workflow_full. Optional override.',
      },
      propertyHelp:
        'Auto-fetched when selecting a workflow. Bind here only to override.',
      /* wwEditor:end */
    },
    initialEdges: {
      label: { en: 'Initial Edges (auto-fetched)' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [],
      options: {
        expandable: true,
        getItemLabel(item) {
          return `${item?.source || item?.from_node_id || '?'} → ${item?.target || item?.to_node_id || '?'}`;
        },
        item: {
          type: 'Object',
          defaultValue: { id: '', source: '', target: '', sourceHandle: 'output' },
          options: {
            item: {
              id: {
                label: { en: 'ID' },
                type: 'Text',
                options: { placeholder: 'Auto-generated if empty' },
              },
              source: {
                label: { en: 'Source Node ID' },
                type: 'Text',
                defaultValue: '',
              },
              target: {
                label: { en: 'Target Node ID' },
                type: 'Text',
                defaultValue: '',
              },
              sourceHandle: {
                label: { en: 'Source Handle' },
                type: 'Text',
                defaultValue: 'output',
              },
            },
          },
        },
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Auto-loaded via bff_get_amp_workflow_full. Optional override.',
      },
      propertyHelp:
        'Auto-fetched when selecting a workflow. Bind here only to override.',
      /* wwEditor:end */
    },

    // ─── Behavior ────────────────────────────────────────────────
    readOnly: {
      label: { en: 'Read Only' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: false,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Enable/disable editing mode',
      },
      propertyHelp: 'Disable editing for view-only mode in analytics pages',
      /* wwEditor:end */
    },
    showEditAction: {
      label: { en: 'Show Edit Button' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Show edit button on selected nodes',
      },
      /* wwEditor:end */
    },
    showDeleteAction: {
      label: { en: 'Show Delete Button' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Show delete button on selected nodes',
      },
      /* wwEditor:end */
    },

    // ─── Config Panel Data Sources ───────────────────────────────
    collections: {
      label: { en: 'Collections (auto-fetched)' },
      type: 'Info',
      section: 'settings',
      options: {
        text: { en: 'Auto-fetched via bff_get_workflow_collections(). Optional override.' },
      },
      bindable: true,
      defaultValue: [],
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Auto-fetched via bff_get_workflow_collections(). Optional override.',
      },
      propertyHelp:
        'Auto-fetched from Supabase. Used by condition builder. Bind here only to override.',
      /* wwEditor:end */
    },
    channels: {
      label: { en: 'Available Channels' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
        { value: 'line', label: 'LINE' },
        { value: 'push', label: 'Push Notification' },
      ],
      options: {
        expandable: true,
        getItemLabel(item, index) {
          return item?.label || item?.value || `Channel ${index + 1}`;
        },
        item: {
          type: 'Object',
          defaultValue: { value: '', label: '' },
          options: {
            item: {
              value: {
                label: { en: 'Value' },
                type: 'Text',
              },
              label: {
                label: { en: 'Label' },
                type: 'Text',
              },
            },
          },
        },
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Array of messaging channels: [{value, label}]',
      },
      propertyHelp:
        'Used by Message and Action node config panels for channel selection.',
      /* wwEditor:end */
    },
    messageTemplates: {
      label: { en: 'Message Templates' },
      type: 'Info',
      section: 'settings',
      options: {
        text: { en: 'Bind array of message templates' },
      },
      bindable: true,
      defaultValue: [],
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Array of message templates: [{id, name, channel, content}]',
      },
      propertyHelp:
        'Used by Message node config panel for template selection. Each template should have id, name, channel, and content.',
      /* wwEditor:end */
    },
    audiences: {
      label: { en: 'Audiences (auto-fetched)' },
      type: 'Info',
      section: 'settings',
      options: {
        text: { en: 'Auto-fetched via bff_list_audiences(). Optional override.' },
      },
      bindable: true,
      defaultValue: [],
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Auto-fetched via bff_list_audiences(). Optional override.',
      },
      propertyHelp:
        'Auto-fetched from Supabase. Used by trigger and action config. Bind here only to override.',
      /* wwEditor:end */
    },
    agents: {
      label: { en: 'Agents (auto-fetched)' },
      type: 'Info',
      section: 'settings',
      options: {
        text: { en: 'Auto-fetched from amp_agent table. Optional override.' },
      },
      bindable: true,
      defaultValue: [],
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Auto-fetched from amp_agent table. Optional override.',
      },
      propertyHelp:
        'Auto-fetched from Supabase. Used by agent node config. Bind here only to override.',
      /* wwEditor:end */
    },
    supabaseUrl: {
      label: { en: 'Supabase URL (required)' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Supabase project URL (e.g., https://abc.supabase.co)',
      },
      propertyHelp:
        'REQUIRED. The component auto-fetches all data (workflows, collections, audiences, agents) from Supabase using this URL.',
      /* wwEditor:end */
    },
    supabaseAnonKey: {
      label: { en: 'Supabase Anon Key (required)' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Supabase publishable/anon key for the apikey header',
      },
      propertyHelp:
        'REQUIRED. The publishable API key from your Supabase project settings.',
      /* wwEditor:end */
    },
    authToken: {
      label: { en: 'Auth Token / JWT (required)' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Current admin user JWT. Bind to Supabase plugin access token.',
      },
      propertyHelp:
        'REQUIRED. Bind to your Supabase plugin access_token. The component uses this for all API calls including auto-fetching data and saving workflows.',
      /* wwEditor:end */
    },

    // ─── Styling ─────────────────────────────────────────────────
    sidebarWidth: {
      label: { en: 'Sidebar Width' },
      type: 'Length',
      section: 'style',
      defaultValue: '150px',
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Width of the node palette sidebar',
      },
      /* wwEditor:end */
    },
    sidebarBackground: {
      label: { en: 'Sidebar Background' },
      type: 'Color',
      section: 'style',
      defaultValue: '#F9FAFB',
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Background color of sidebar',
      },
      /* wwEditor:end */
    },
    canvasBackground: {
      label: { en: 'Canvas Background' },
      type: 'Color',
      section: 'style',
      defaultValue: '#FFFFFF',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Background color of canvas',
      },
      /* wwEditor:end */
    },
    gridColor: {
      label: { en: 'Grid Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#E5E7EB',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Color of background grid',
      },
      /* wwEditor:end */
    },
    configPanelWidth: {
      label: { en: 'Config Panel Width' },
      type: 'Length',
      section: 'style',
      defaultValue: '360px',
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Width of the node config panel (e.g., 360px, 400px)',
      },
      propertyHelp: 'Width of the node configuration sidebar that appears when editing a node.',
      /* wwEditor:end */
    },

    // ─── Node Colors ─────────────────────────────────────────────
    conditionNodeColor: {
      label: { en: 'Condition Node Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#3B82F6',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Color for condition nodes' },
      /* wwEditor:end */
    },
    messageNodeColor: {
      label: { en: 'Message Node Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#10B981',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Color for message nodes' },
      /* wwEditor:end */
    },
    waitNodeColor: {
      label: { en: 'Wait Node Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#F59E0B',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Color for wait nodes' },
      /* wwEditor:end */
    },
    apiNodeColor: {
      label: { en: 'API Node Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#8B5CF6',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Color for API nodes' },
      /* wwEditor:end */
    },
    agentNodeColor: {
      label: { en: 'Agent Node Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#06B6D4',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Color for agent (AI) nodes' },
      /* wwEditor:end */
    },
  },
};
