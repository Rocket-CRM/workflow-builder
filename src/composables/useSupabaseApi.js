import { ref, computed, watch } from 'vue';

const DEFAULT_SUPABASE_URL = 'https://wkevmsedchftztoolkmi.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXZtc2VkY2hmdHp0b29sa21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MTM2OTgsImV4cCI6MjA2NjA4OTY5OH0.bd8ELGtX8ACmk_WCxR_tIFljwyHgD3YD4PdBDpD-kSM';

/**
 * Centralized Supabase API layer for the Workflow Builder.
 * Self-fetches all required data (workflows, collections, audiences, agents, action options).
 * Accepts optional supabaseUrl and supabaseAnonKey refs/computeds; falls back to hardcoded defaults.
 */
export function useSupabaseApi(supabaseUrl, supabaseAnonKey, authToken) {
  const getUrl = () => supabaseUrl?.value || DEFAULT_SUPABASE_URL;
  const getAnonKey = () => supabaseAnonKey?.value || DEFAULT_SUPABASE_ANON_KEY;
  const getToken = () => authToken?.value || '';

  const workflows = ref([]);
  const workflowDetail = ref(null);
  const collections = ref([]);
  const audiences = ref([]);
  const agents = ref([]);
  const actionOptions = ref(null);

  const loading = ref({
    workflows: false,
    workflowDetail: false,
    collections: false,
    audiences: false,
    agents: false,
    actionOptions: false,
    saving: false,
  });

  const errors = ref({});

  const isReady = computed(() => !!getToken());

  // ─── Core fetch helpers ────────────────────────────────

  const rpc = async (functionName, body = {}) => {
    const token = getToken();
    if (!token) return null;

    const res = await fetch(`${getUrl()}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': getAnonKey(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`RPC ${functionName} failed (${res.status}): ${text}`);
    }

    return res.json();
  };

  const postgrest = async (table, query = '') => {
    const token = getToken();
    if (!token) return null;

    const res = await fetch(`${getUrl()}/rest/v1/${table}${query ? '?' + query : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': getAnonKey(),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET ${table} failed (${res.status}): ${text}`);
    }

    return res.json();
  };

  const edgeFunction = async (functionName, body = {}) => {
    const token = getToken();
    if (!token) return null;

    const res = await fetch(`${getUrl()}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Edge fn ${functionName} failed (${res.status}): ${text}`);
    }

    return res.json();
  };

  // ─── Workflow List ────────────────────────────────────

  const fetchWorkflows = async () => {
    if (!isReady.value) return;
    loading.value = { ...loading.value, workflows: true };
    errors.value = { ...errors.value, workflows: null };
    try {
      const data = await postgrest(
        'amp_workflow',
        'select=id,name,description,is_active,scope,domain,workflow_code,run_mode,config,created_at,updated_at&scope=eq.user&order=updated_at.desc'
      );
      if (Array.isArray(data)) {
        workflows.value = data;
      }
    } catch (err) {
      console.error('[useSupabaseApi] fetchWorkflows failed:', err);
      errors.value = { ...errors.value, workflows: err.message };
    } finally {
      loading.value = { ...loading.value, workflows: false };
    }
  };

  // ─── Workflow Full Detail (nodes + edges) ─────────────────

  const fetchWorkflowDetail = async (workflowId) => {
    if (!isReady.value || !workflowId) return null;
    loading.value = { ...loading.value, workflowDetail: true };
    errors.value = { ...errors.value, workflowDetail: null };
    try {
      const data = await rpc('bff_get_amp_workflow_full', { p_workflow_id: workflowId });
      workflowDetail.value = data;
      return data;
    } catch (err) {
      console.error('[useSupabaseApi] fetchWorkflowDetail failed:', err);
      errors.value = { ...errors.value, workflowDetail: err.message };
      return null;
    } finally {
      loading.value = { ...loading.value, workflowDetail: false };
    }
  };

  // ─── Collections (for condition builder) ──────────────────

  const fetchCollections = async () => {
    if (!isReady.value) return;
    loading.value = { ...loading.value, collections: true };
    errors.value = { ...errors.value, collections: null };
    try {
      const data = await rpc('bff_get_workflow_collections');
      if (Array.isArray(data)) {
        collections.value = data;
      } else if (data?.collections) {
        collections.value = data.collections;
      }
    } catch (err) {
      console.error('[useSupabaseApi] fetchCollections failed:', err);
      errors.value = { ...errors.value, collections: err.message };
    } finally {
      loading.value = { ...loading.value, collections: false };
    }
  };

  // ─── Audiences ────────────────────────────────────────

  const fetchAudiences = async () => {
    if (!isReady.value) return;
    loading.value = { ...loading.value, audiences: true };
    errors.value = { ...errors.value, audiences: null };
    try {
      const data = await rpc('bff_list_audiences');
      if (Array.isArray(data)) {
        audiences.value = data;
      } else if (data?.data) {
        audiences.value = data.data;
      }
    } catch (err) {
      console.error('[useSupabaseApi] fetchAudiences failed:', err);
      errors.value = { ...errors.value, audiences: err.message };
    } finally {
      loading.value = { ...loading.value, audiences: false };
    }
  };

  // ─── Agents ───────────────────────────────────────────

  const fetchAgents = async () => {
    if (!isReady.value) return;
    loading.value = { ...loading.value, agents: true };
    errors.value = { ...errors.value, agents: null };
    try {
      const data = await postgrest(
        'amp_agent',
        'select=id,name,description,objective,is_active&is_active=eq.true&order=name.asc'
      );
      if (Array.isArray(data)) {
        agents.value = data;
      }
    } catch (err) {
      console.error('[useSupabaseApi] fetchAgents failed:', err);
      errors.value = { ...errors.value, agents: err.message };
    } finally {
      loading.value = { ...loading.value, agents: false };
    }
  };

  // ─── Action Options (tags, personas, forms, ticket types, earn factors) ──

  const fetchActionOptions = async () => {
    if (!isReady.value) return;
    loading.value = { ...loading.value, actionOptions: true };
    errors.value = { ...errors.value, actionOptions: null };
    try {
      const data = await rpc('bff_get_amp_action_options');
      if (data?.success !== false) {
        actionOptions.value = data;
      }
    } catch (err) {
      console.error('[useSupabaseApi] fetchActionOptions failed:', err);
      errors.value = { ...errors.value, actionOptions: err.message };
    } finally {
      loading.value = { ...loading.value, actionOptions: false };
    }
  };

  // ─── Save Workflow (upsert) ─────────────────────────────

  const saveWorkflow = async (payload) => {
    if (!isReady.value) throw new Error('Auth token not configured');
    loading.value = { ...loading.value, saving: true };
    errors.value = { ...errors.value, saving: null };
    try {
      const data = await rpc('bff_upsert_amp_workflow_with_graph', payload);
      return data;
    } catch (err) {
      console.error('[useSupabaseApi] saveWorkflow failed:', err);
      errors.value = { ...errors.value, saving: err.message };
      throw err;
    } finally {
      loading.value = { ...loading.value, saving: false };
    }
  };

  // ─── Duplicate Workflow ─────────────────────────────────

  const duplicateWorkflow = async (workflowId, newName) => {
    if (!isReady.value) throw new Error('Auth token not configured');
    try {
      return await rpc('bff_duplicate_amp_workflow', {
        p_workflow_id: workflowId,
        p_new_name: newName,
      });
    } catch (err) {
      console.error('[useSupabaseApi] duplicateWorkflow failed:', err);
      throw err;
    }
  };

  // ─── Form Fields ──────────────────────────────────────

  const fetchFormFields = async (formId) => {
    if (!isReady.value || !formId) return null;
    try {
      return await rpc('bff_get_amp_form_fields', { p_form_id: formId });
    } catch (err) {
      console.error('[useSupabaseApi] fetchFormFields failed:', err);
      throw err;
    }
  };

  // ─── Node Stats ───────────────────────────────────────

  const fetchNodeStats = async (workflowId) => {
    if (!isReady.value || !workflowId) return null;
    try {
      return await rpc('bff_get_amp_workflow_node_stats', { p_workflow_id: workflowId });
    } catch (err) {
      console.error('[useSupabaseApi] fetchNodeStats failed:', err);
      return null;
    }
  };

  // ─── Batch Run ────────────────────────────────────────

  const batchRun = async (workflowId) => {
    if (!isReady.value || !workflowId) return null;
    try {
      return await rpc('bff_amp_batch_run', { p_workflow_id: workflowId });
    } catch (err) {
      console.error('[useSupabaseApi] batchRun failed:', err);
      throw err;
    }
  };

  const batchDispatch = async (workflowId, merchantId, userIds) => {
    if (!isReady.value) throw new Error('Auth token not configured');
    try {
      return await edgeFunction('amp-batch-dispatch', {
        workflow_id: workflowId,
        merchant_id: merchantId,
        user_ids: userIds,
      });
    } catch (err) {
      console.error('[useSupabaseApi] batchDispatch failed:', err);
      throw err;
    }
  };

  // ─── Fetch All Reference Data ─────────────────────────

  const fetchAllReferenceData = async () => {
    if (!isReady.value) return;
    await Promise.allSettled([
      fetchCollections(),
      fetchAudiences(),
      fetchAgents(),
      fetchActionOptions(),
    ]);
  };

  return {
    // State
    workflows,
    workflowDetail,
    collections,
    audiences,
    agents,
    actionOptions,
    loading,
    errors,
    isReady,

    // Methods
    rpc,
    postgrest,
    fetchWorkflows,
    fetchWorkflowDetail,
    fetchCollections,
    fetchAudiences,
    fetchAgents,
    fetchActionOptions,
    fetchFormFields,
    fetchNodeStats,
    saveWorkflow,
    duplicateWorkflow,
    batchRun,
    batchDispatch,
    fetchAllReferenceData,
  };
}
