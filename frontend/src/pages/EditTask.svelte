<script>
  import { onMount } from 'svelte';
  import { apiFetch } from '../lib/api';
  import TaskForm from '../components/TaskForm.svelte';
  import SearchBox from '../components/SearchBox.svelte';

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
      // 1. PATCH the base text/date/status data
      const patchRes = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(baseData),
      });
      if (!patchRes.ok) throw new Error('Failed to update basic task details.');

      // 2. POST the new Assignee (if one was selected)
      // (Check your backend schema to ensure it expects { userId: id } or similar)
      if (assigneeId) {
        await apiFetch(`/api/tasks/${taskId}/assign`, {
          method: 'POST',
          body: JSON.stringify({ userId: assigneeId }),
        });
      }

      // 3. POST the Dependencies
      // Native multi-selects return arrays. We loop through and fire the endpoints.
      if (dependencyIds && dependencyIds.length > 0) {
        for (const depId of dependencyIds) {
          await apiFetch(`/api/tasks/${taskId}/dependencies`, {
            method: 'POST',
            body: JSON.stringify({ dependsOnId: depId }),
          });
        }
      }
      
      // All done! Route back to see the results
      goTo('task-detail', taskId);
      
    } catch (err) {
      error = err.message;
    } finally {
      saveLoading = false;
    }
  }
</script>

<main>
  <h1>Edit Task</h1>

  {#if loading}
    <p>Loading task data...</p>
  {:else if error}
    <p style="color: red;">Error: {error}</p>
  {:else if task}
    <TaskForm
      goTo={goTo}
      taskId={taskId}
      initial={{
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_to: task.due_to,
        status: task.status
      }}
      initialAssignees={task.assignedTo || []}
      initialDependencies={task.dependencies || []}
      loading={saveLoading}
      error={error}
      on:save={handleSave}
    />
  {/if}
</main>
