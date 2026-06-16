<script>
  import { onMount } from 'svelte';
  import { apiFetch } from '../lib/api';
  import TaskForm from '../components/TaskForm.svelte';

  let { goTo, taskId } = $props();
  let task = $state(null);
  let loading = $state(true);
  let saveLoading = $state(false);
  let error = $state('');

  onMount(async () => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Task not found');
      task = data.data || data.task;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });

  async function handleSave(event) {
    const { baseData, assigneeId, dependencyIds } = event.detail;
    saveLoading = true;
    error = '';
    try {
      const patchRes = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(baseData),
      });
      if (!patchRes.ok) throw new Error('Failed to update basic task details.');

      if (assigneeId) {
        await apiFetch(`/api/tasks/${taskId}/assign`, {
          method: 'POST',
          body: JSON.stringify({ userId: assigneeId }),
        });
      }
      if (dependencyIds?.length > 0) {
        for (const depId of dependencyIds) {
          await apiFetch(`/api/tasks/${taskId}/dependencies`, {
            method: 'POST',
            body: JSON.stringify({ dependsOnId: depId }),
          });
        }
      }
      goTo('task-detail', taskId);
    } catch (err) {
      error = err.message;
    } finally {
      saveLoading = false;
    }
  }
</script>

<main class="page">
  {#if loading}
    <div class="card text-center text-muted" style="padding: 3rem;">Loading...</div>
  {:else if error}
    <div class="card" style="padding: 2rem;">
      <div class="alert alert-error">{error}</div>
      <button onclick={() => goTo('admin-dashboard')} class="btn btn-secondary mt-sm">← Dashboard</button>
    </div>
  {:else if task}
    <div class="card">
      <header style="margin-bottom: 2rem;">
        <h1>Edit Task</h1>
        <p class="text-muted">Modify task details, assignee, and dependencies</p>
      </header>
      <TaskForm goTo={goTo} taskId={taskId} initial={{
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_to: task.due_to,
        status: task.status
      }} initialAssignees={task.assignedTo || []} initialDependencies={task.dependencies || []} loading={saveLoading} error={error} on:save={handleSave} />
    </div>
  {/if}
</main>
