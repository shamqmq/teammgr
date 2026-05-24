<script>
  import { onMount } from 'svelte';
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo, taskId } = $props();

  let task = $state(null);
  let loading = $state(true);
  let error = $state('');
  let statusLoading = $state(false);
  let statusError = $state('');

  async function loadTask() {
    loading = true;
    error = '';
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Task not found');
      task = data.data || data.task;
    } catch (err) {
      error = err.message;
      task = null;
    } finally {
      loading = false;
    }
  }

  onMount(loadTask);

  async function forwardStatus() {
    if (!task) return;
    const statusFlow = { todo: 'in_progress', in_progress: 'done' };
    const nextStatus = statusFlow[task.status];
    if (!nextStatus) return;

    statusLoading = true;
    statusError = '';
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status update failed');
      // Refresh the task to show updated status
      await loadTask();
    } catch (err) {
      statusError = err.message;
    } finally {
      statusLoading = false;
    }
  }

  function canForward(taskStatus) {
    return taskStatus === 'todo' || taskStatus === 'in_progress';
  }

  // Helper to display a friendly creator identifier
  function friendlyCreator(task) {
    if (task.created_by === $auth.user?.id) {
      return $auth.user?.name || $auth.user?.email || 'You';
    }
    // Fallback: use a human-readable short UUID if no name available
    const id = task.created_by || '';
    return id ? 'User ' + id.slice(0, 8) : 'Unknown';
  }
</script>

<div>

    {#if $auth.user?.role === 'admin'}
        <button on:click={() => goTo('admin-dashboard')}>← Back to Dashboard</button>
    {:else}
        <button on:click={() => goTo('dashboard')}>← Back to Dashboard</button>
    {/if}

  {#if loading}
    <p>Loading task...</p>
  {:else if error}
    <p>Error: {error}</p>
  {:else if task}
    <h1>{task.title}</h1>
    <p><strong>Description:</strong> {task.description || 'No description'}</p>
    <p><strong>Status:</strong> {task.status.replace('_', ' ')}</p>
    <p><strong>Priority:</strong> {task.priority}</p>
    <p><strong>Due date:</strong> {new Date(task.due_to).toLocaleDateString()}</p>
    <p><strong>Created by:</strong> {friendlyCreator(task)}</p>
    <p><strong>Assigned to:</strong>
      {#if task.assignedTo && task.assignedTo.length > 0}
        {task.assignedTo.map(u => u.email || u.id).join(', ')}
      {:else}
        No one yet
      {/if}
    </p>

    {#if canForward(task.status)}
      <button on:click={forwardStatus} disabled={statusLoading}>
        {statusLoading ? 'Updating...' : `Mark as ${task.status === 'todo' ? 'In Progress' : 'Done'}`}
      </button>
      {#if statusError}<p style="color: red;">{statusError}</p>{/if}
    {/if}

    {#if $auth.user?.role === 'admin'}
      <button on:click={() => goTo('edit-task', taskId)}>Edit Task</button>
    {/if}
  {:else}
    <p>No task data.</p>
  {/if}
</div>
