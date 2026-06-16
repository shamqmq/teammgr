<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
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
  import AddTask from './pages/AddTask.svelte';
  import Navbar from './components/Navbar.svelte';

  let currentPage = $state('loading');
  let taskId = $state(null);
  let authReady = $state(false);

  // Reactive auth state for the guard
  let authState = $state(get(auth));
  auth.subscribe(value => { authState = value; });

  function applyHash(hash) {
    const clean = hash.replace('#/', '');
    const parts = clean.split('/');
    const path = parts[0];
    const id = parts[1] || null;

    if (path === 'task') {
      if (id === 'new') { currentPage = 'add-task'; taskId = null; }
      else if (parts[2] === 'edit') { currentPage = 'edit-task'; taskId = id; }
      else if (id) { currentPage = 'task-detail'; taskId = id; }
      else { currentPage = 'dashboard'; }
      return;
    }

    switch (path) {
      case 'login':           currentPage = 'login'; break;
      case 'register':        currentPage = 'register'; break;
      case 'dashboard':       currentPage = 'dashboard'; break;
      case 'admin-dashboard': currentPage = 'admin-dashboard'; break;
      case 'edit-profile':    currentPage = 'edit-profile'; break;
      case 'request-task':    currentPage = 'request-task'; break;
      default:                currentPage = 'login'; break;
    }
    taskId = null;
  }

  function goTo(page, id = null) {
    let newHash = '#/login';
    if (page === 'dashboard') newHash = '#/dashboard';
    else if (page === 'admin-dashboard') newHash = '#/admin-dashboard';
    else if (page === 'task-detail') newHash = '#/task/' + id;
    else if (page === 'edit-task') newHash = '#/task/' + id + '/edit';
    else if (page === 'add-task') newHash = '#/task/new';
    else if (page === 'edit-profile') newHash = '#/edit-profile';
    else if (page === 'request-task') newHash = '#/request-task';
    else if (page === 'register') newHash = '#/register';
    else if (page === 'login') newHash = '#/login';
    window.location.hash = newHash;
  }

  onMount(async () => {
    try {
      const refreshRes = await apiFetch('/api/auth/refresh', { method: 'POST' });
      const refreshData = await refreshRes.json();

      if (refreshData?.data?.accessToken) {
        const token = refreshData.data.accessToken;
        const userRes = await apiFetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userData = await userRes.json();
        const user = userData?.user;

        auth.set({
          token,
          user: user ? {
            id: user.id,
            email: user.email,
            name: user.name || user.email,
            role: user.role,
          } : null,
          loading: false,
        });
      } else {
        auth.set({ token: null, user: null, loading: false });
      }
    } catch {
      auth.set({ token: null, user: null, loading: false });
    } finally {
      authReady = true;
      applyHash(window.location.hash || '#/login');
    }

    const onHashChange = () => applyHash(window.location.hash || '#/login');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  });

  // Auth + Role Guard
  $effect(() => {
    if (!authReady || authState.loading) return;

    const isPublic = ['login', 'register', 'loading'].includes(currentPage);
    const isAdminRoute = ['admin-dashboard', 'add-task', 'edit-task'].includes(currentPage);
    const isEmployeeRoute = ['dashboard', 'request-task'].includes(currentPage);
    const role = authState.user?.role;

    // 1. Not logged in → kick to login (unless already there)
    if (!authState.token && !isPublic) {
      goTo('login');
      return;
    }

    // 2. Logged in but on public page → send to proper dashboard
    if (authState.token && isPublic) {
      goTo(role === 'admin' ? 'admin-dashboard' : 'dashboard');
      return;
    }

    // 3. Employee trying to access admin routes → kick to employee dashboard
    if (authState.token && role === 'employee' && isAdminRoute) {
      goTo('dashboard');
      return;
    }

    // 4. Admin trying to access employee routes → kick to admin dashboard
    if (authState.token && role === 'admin' && isEmployeeRoute) {
      goTo('admin-dashboard');
      return;
    }
  });
</script>

<div class="app-bg"></div>
<div class="grid-pattern"></div>

{#if authState.token && authState.user && !['loading', 'login', 'register'].includes(currentPage)}
  <Navbar goTo={goTo} />
{/if}

<main class="container">
  {#if !authReady || authState.loading}
    <div class="text-center text-muted" style="padding: 3rem;">
      <p>Loading session...</p>
    </div>
  {:else if currentPage === 'login'}
    <Login goTo={goTo} />
  {:else if currentPage === 'register'}
    <Register goTo={goTo} />
  {:else if currentPage === 'dashboard'}
    <EmployeeDashboard goTo={goTo} />
  {:else if currentPage === 'admin-dashboard'}
    <AdminDashboard goTo={goTo} />
  {:else if currentPage === 'add-task'}
    <AddTask goTo={goTo} />
  {:else if currentPage === 'task-detail'}
    <TaskDetail goTo={goTo} taskId={taskId} />
  {:else if currentPage === 'edit-task'}
    <EditTask goTo={goTo} taskId={taskId} />
  {:else if currentPage === 'edit-profile'}
    <EditProfile goTo={goTo} />
  {:else if currentPage === 'request-task'}
    <RequestTask goTo={goTo} />
  {/if}
</main>