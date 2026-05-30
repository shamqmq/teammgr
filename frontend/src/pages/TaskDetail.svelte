<script>
  import { onMount } from 'svelte';
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo, taskId } = $props();

  let task = $state(null);
  let dependencies = $state([]); // List of tasks this task relies on
  let loading = $state(true);
  let error = $state('');
  let actionLoading = $state(false);

  async function loadTask() {
    loading = true;
    error = '';
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Task not found');
      
      task = data.data || data.task;
      // Assuming your backend populates dependencies as an array of task objects
      dependencies = task.dependencies || []; 
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(loadTask);

  async function updateStatus(newStatus) {
    actionLoading = true;
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Status update rejected by server.');
      
      await loadTask(); // Reload data to reflect changes
    } catch (err) {
      alert(err.message); // Simple alert for action errors to avoid cluttering the UI
    } finally {
      actionLoading = false;
    }
  }

  // Reactive derived state to check if dependencies are blocking progress
  let dependenciesMet = $derived(
    dependencies.every(dep => dep.status === 'done')
  );
</script>

<main>
  {#if loading}
    <p>Loading task details...</p>
  {:else if error}
    <p>Error: {error}</p>
  {:else if task}
    <h1>{task.title}</h1>
    <p><strong>Description:</strong> {task.description || 'No description provided.'}</p>
    <p><strong>Status:</strong> {task.status.replace('_', ' ')}</p>
    <p><strong>Priority:</strong> {task.priority}</p>
    <p><strong>Due Date:</strong> {task.due_to ? new Date(task.due_to).toLocaleDateString() : 'None'}</p>
    <p><strong>Assigned To:</strong> {task.assignedTo?.length ? task.assignedTo.map(u => u.name || u.email).join(', ') : 'Unassigned'}</p>

    {#if dependencies.length > 0}
      <section style="border: 1px solid #ccc; padding: 1rem; margin-top: 1rem;">
        <h3>Dependencies (Must be Done first)</h3>
        <ul>
          {#each dependencies as dep}
            <li>
              <button on:click={() => goTo('task-detail', dep.id)}>{dep.title}</button> 
              - Status: {dep.status}
            </li>
          {/each}
        </ul>
        {#if !dependenciesMet}
          <p style="color: red;">⚠️ You cannot progress this task until all dependencies are Done.</p>
        {/if}
      </section>
    {/if}

    <section style="margin-top: 2rem;">
      {#if task.status === 'todo'}
        <button 
          disabled={actionLoading || !dependenciesMet} 
          on:click={() => updateStatus('in_progress')}
        >
          Start Task (In Progress)
        </button>
      {:else if task.status === 'in_progress'}
        <button 
          disabled={actionLoading || !dependenciesMet} 
          on:click={() => updateStatus('done')}
        >
          Mark as Done
        </button>
      {/if}

      {#if $auth.user?.role === 'admin'}
        <button on:click={() => goTo('edit-task', taskId)}>Edit Task</button>
      {/if}
    </section>
  {/if}
</main>
