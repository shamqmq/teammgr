<script>
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();

  let tasks = $state([]);
  let loading = $state(true);
  let error = $state('');
  
  let actionLoadingId = $state(null); 
  
  let page = $state(1);
  let totalPages = $state(1);
  let totalTasks = $state(0); 
  const limit = 20;

  async function loadTasks() {
    loading = true;
    error = '';
    try {
      const res = await apiFetch(`/api/tasks?page=${page}&limit=${limit}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to load tasks');
      
      tasks = data.data || [];
      totalTasks = data.total || 0;
      totalPages = Math.ceil(totalTasks / limit) || 1;
    } catch (e) {
      error = e.message;
      tasks = [];
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    page; 
    loadTasks();
  });

  async function updateStatus(taskId, newStatus) {
    actionLoadingId = taskId;
    error = '';
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status.');
      }
      tasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    } catch (e) {
      error = e.message;
    } finally {
      actionLoadingId = null;
    }
  }
</script>

<main style="max-width: 800px; margin: 0 auto; padding: 1rem;">
  <header style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #eaeaea;">
    <div>
      <h1 style="margin: 0; font-size: 1.5rem;">Welcome, {$auth.user?.name || $auth.user?.email || 'Employee'}</h1>
      <p style="margin: 0; color: #666;">Role: {$auth.user?.role}</p>
    </div>
    <div style="display: flex; gap: 1rem;">
      <button onclick={() => goTo('request-task')} style="background: #28a745; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        + Request Task
      </button>
      <button onclick={() => goTo('edit-profile')} style="background: #f8f9fa; border: 1px solid #ccc; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
        Edit Profile
      </button>
    </div>
  </header>

  <h2>Your Assignments ({totalTasks})</h2>

  {#if loading}
    <p>Loading your tasks...</p>
  {:else if error}
    <p style="color: red;">Error: {error}</p>
  {:else if tasks.length === 0}
    <p>You have no assigned tasks right now.</p>
  {:else}
    <ul style="list-style: none; padding: 0;">
      {#each tasks as task (task.id)}
        <li style="border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 6px;">
          <div style="margin-bottom: 0.5rem;">
            <button onclick={() => goTo('task-detail', task.id)} style="background: none; border: none; color: #007bff; cursor: pointer; font-size: 1.1rem; font-weight: bold; padding: 0;">
              {task.title}
            </button>
          </div>
          <div style="color: #555; margin-bottom: 1rem;">
            <span>Status: <strong>{task.status.replace('_', ' ')}</strong></span>
            {#if task.due_to}
              <span> | Due: {new Date(task.due_to).toLocaleDateString()}</span>
            {/if}
          </div>
          
          {#if task.status === 'todo'}
             <button disabled={actionLoadingId === task.id} onclick={() => updateStatus(task.id, 'in_progress')} style="padding: 0.4rem 0.8rem; cursor: pointer;">
               Start Task
             </button>
          {:else if task.status === 'in_progress'}
             <button disabled={actionLoadingId === task.id} onclick={() => updateStatus(task.id, 'done')} style="padding: 0.4rem 0.8rem; cursor: pointer;">
               Mark Done
             </button>
          {/if}
        </li>
      {/each}
    </ul>

    <div style="display: flex; gap: 1rem; align-items: center; margin-top: 2rem;">
      <button disabled={page === 1} onclick={() => page--} style="padding: 0.5rem;">Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page === totalPages} onclick={() => page++} style="padding: 0.5rem;">Next</button>
    </div>
  {/if}
</main>
