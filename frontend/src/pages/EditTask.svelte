<script>
  import { onMount } from 'svelte';
  import { apiFetch } from '../lib/api';
  import TaskForm from '../components/TaskForm.svelte';

  let { goTo, taskId } = $props();

  let task = $state(null);
  let loading = $state(true);
  let saveLoading = $state(false);
  let error = $state('');
  let showModal = $state(false); // ← ADD

  onMount(async () => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Task not found');
      task = data.data || data.task;
      if (!task) throw new Error('Task data is empty');
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });

  async function handleSave(payload) {
    saveLoading = true;
    error = '';
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update task');
      goTo('task-detail', taskId);
    } catch (err) {
      error = err.message;
    } finally {
      saveLoading = false;
    }
  }

  async function confirmDelete() {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      goTo('admin-dashboard');
    } catch (err) {
      error = err.message;
    } finally {
      showModal = false;
    }
  }
</script>

<main class="page">
  {#if loading}
    <div class="card text-center text-muted" style="padding: 3rem;">Loading task...</div>
  {:else if error}
    <div class="card" style="padding: 2rem;">
      <div class="alert alert-error">{error}</div>
      <button onclick={() => goTo('admin-dashboard')} class="btn btn-secondary mt-sm">← Dashboard</button>
    </div>
  {:else if task}
    <div class="card">
      <div class="flex justify-between items-center" style="margin-bottom: 2rem;">
        <div>
          <h1>Edit Task</h1>
          <p class="text-muted">Modify task details, assignee, and dependencies</p>
        </div>
        <button onclick={() => showModal = true} class="btn btn-danger">Delete Task</button>
      </div>

      <TaskForm
        {goTo}
        taskId={taskId}
        initial={{
          title: task.title,
          description: task.description,
          priority: task.priority,
          due_to: task.due_to,
          status: task.status,
          assignedTo: task.assignedTo || [],
          dependencies: task.dependencies || []
        }}
        onSave={handleSave}
        loading={saveLoading}
        error={error}
      />
    </div>
  {:else}
    <div class="card" style="padding: 2rem;">
      <div class="alert alert-error">Task not found or you don't have access.</div>
      <button onclick={() => goTo('admin-dashboard')} class="btn btn-secondary mt-sm">← Dashboard</button>
    </div>
  {/if}
</main>

{#if showModal}
  <div class="modal-overlay" onclick={() => showModal = false}>
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-title">Delete Task</div>
      <div class="modal-text">
        Are you sure you want to delete <strong>{task?.title}</strong>?<br>
        This action cannot be undone.
      </div>
      <div class="modal-actions">
        <button onclick={() => showModal = false} class="btn btn-secondary">Cancel</button>
        <button onclick={confirmDelete} class="btn btn-danger">Delete</button>
      </div>
    </div>
  </div>
{/if}