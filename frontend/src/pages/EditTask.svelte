<script>
  import { onMount } from 'svelte';
  import { apiFetch } from '../lib/api';
  import TaskForm from '../components/TaskForm.svelte';

  let { goTo, taskId } = $props();   // we need taskId passed from parent

  let task = $state(null);
  let loading = $state(true);
  let error = $state('');
  let saveLoading = $state(false);

  onMount(async () => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Task not found');
      task = data.data || data.task;   // adjust based on your response shape
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });

  async function handleSave(event) {
    const updatedData = event.detail;
    saveLoading = true;
    error = '';
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      goTo('admin-dashboard');
    } catch (err) {
      error = err.message;
    } finally {
      saveLoading = false;
    }
  }
</script>

<div class="page-container">
  <h1>Edit Task</h1>
  {#if loading}
    <p>Loading task...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if task}
    <TaskForm
      initial={{
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_to: task.due_to,
        status: task.status,
        assignedTo: task.assignedTo || [],
      }}
      loading={saveLoading}
      error={error}
      on:save={handleSave}
    />
  {/if}
  <button class="back-btn" on:click={() => goTo('admin-dashboard')}>← Back to Dashboard</button>
</div>

