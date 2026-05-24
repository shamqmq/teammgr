<script>
  import { onMount } from 'svelte';
  import { auth } from './lib/stores/auth';
  import { apiFetch } from './lib/api';
  import Login from './pages/Login.svelte';
  import Register from './pages/Register.svelte';
  import EmployeeDashboard from './pages/EmployeeDashboard.svelte';
  import AdminDashboard from './pages/AdminDashboard.svelte';
  import TaskDetail from './pages/TaskDetail.svelte';
  import EditProfile from './pages/EditProfile.svelte';
  import RequestTask from './pages/RequestTask.svelte';
  import EditTask from './pages/EditTask.svelte';

  let currentPage = $state('loading');
  let taskId = $state(null);

  // ----- Hash routing -----
  function applyHash(hash) {
    const clean = hash.replace('#/', '');
    const parts = clean.split('/');
    const path = parts[0];
    const id = parts[1] || null;

    // Task routes with optional '/edit'
    if (path === 'task' && id) {
      if (parts[2] === 'edit') {
        currentPage = 'edit-task';
        taskId = id;
      } else {
        currentPage = 'task-detail';
        taskId = id;
      }
      return;
    }

    switch (path) {
      case 'login':          currentPage = 'login'; break;
      case 'register':       currentPage = 'register'; break;
      case 'dashboard':      currentPage = 'dashboard'; break;
      case 'admin-dashboard': currentPage = 'admin-dashboard'; break;
      case 'edit-profile':   currentPage = 'edit-profile'; break;
      case 'request-task':   currentPage = 'request-task'; break;
      default:               currentPage = 'login'; break;
    }
    taskId = null;
  }

  // ----- Navigation -----
  function goTo(page, id = null) {
    let newHash = '#/login';
    if (page === 'dashboard') newHash = '#/dashboard';
    else if (page === 'admin-dashboard') newHash = '#/admin-dashboard';
    else if (page === 'task-detail') newHash = '#/task/' + (id || '');
    else if (page === 'edit-task') newHash = '#/task/' + (id || '') + '/edit';
    else if (page === 'edit-profile') newHash = '#/edit-profile';
    else if (page === 'request-task') newHash = '#/request-task';
    else if (page === 'register') newHash = '#/register';
    else if (page === 'login') newHash = '#/login';

    window.location.hash = newHash;
  }

  // ----- Init -----
  onMount(async () => {
    // 1. Try to restore session
    try {
      const res = await apiFetch('/api/auth/refresh', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.data.accessToken) {
        auth.set({
          token: data.data.accessToken,
          user: data.data.user || null,
          loading: false,
        });
      } else {
        throw new Error('no session');
      }
    } catch (e) {
      auth.set({ token: null, user: null, loading: false });
    }

    // 2. Apply current hash AFTER auth is ready
    applyHash(window.location.hash || '#/login');

    // 3. Listen for hash changes (browser back/forward)
    const onHashChange = () => applyHash(window.location.hash || '#/login');
    window.addEventListener('hashchange', onHashChange);

    // 4. Auth guard using store subscription (doesn't react to page changes)
    const unsubscribe = auth.subscribe((authState) => {
      if (authState.loading) return;
      if (!authState.token) {
        const protectedPages = [
          'dashboard',
          'admin-dashboard',
          'task-detail',
          'edit-task',
          'edit-profile',
          'request-task',
        ];
        if (protectedPages.includes(currentPage)) {
          goTo('login');
        }
      }
    });

    // Cleanup on component destroy
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      unsubscribe();
    };
  });
</script>

{#if currentPage === 'loading'}
  <div>Loading…</div>
{:else if currentPage === 'login'}
  <Login goTo={goTo} />
{:else if currentPage === 'register'}
  <Register goTo={goTo} />
{:else if currentPage === 'dashboard'}
  <EmployeeDashboard goTo={goTo} />
{:else if currentPage === 'admin-dashboard'}
  <AdminDashboard goTo={goTo} />
{:else if currentPage === 'task-detail'}
  <TaskDetail goTo={goTo} taskId={taskId} />
{:else if currentPage === 'edit-task'}
  <EditTask goTo={goTo} taskId={taskId} />
{:else if currentPage === 'edit-profile'}
  <EditProfile goTo={goTo} />
{:else if currentPage === 'request-task'}
  <RequestTask goTo={goTo} />
{/if}
