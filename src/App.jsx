import { useState, useEffect, useMemo, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useArcGISAuth } from './hooks/useArcGISAuth';
import { useGroups } from './hooks/useGroups';
import { useAllContent, useContent } from './hooks/useContent';
import { useClickrayAnalysis } from './hooks/useClickrayAnalysis';
import { AppLayout } from './components/Layout/AppLayout';
import { SummaryDashboard } from './components/Summary/SummaryDashboard';
import { ClickrayAnalysis } from './components/Summary/ClickrayAnalysis';
import { GroupList } from './components/Groups/GroupList';
import { ContentTable } from './components/Content/ContentTable';
import { ArchiveModal } from './components/Archive/ArchiveModal';
import { Login } from './components/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Dashboard() {
  const { token, user, org, isAuthenticated, loading, error, login, logout, autoLogin } =
    useArcGISAuth();

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [serviceStatsMap, setServiceStatsMap] = useState({});
  const [archiveItems, setArchiveItems] = useState([]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const orgId = org?.id;

  // Attempt auto-login on mount
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      autoLogin();
    }
  }, [isAuthenticated, loading, autoLogin]);

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useGroups(token, orgId);

  // Fetch content (all or filtered by group)
  const { data: allContent, isLoading: allContentLoading } = useAllContent(
    token,
    orgId
  );
  const { data: groupContent, isLoading: groupContentLoading } = useContent(
    token,
    orgId,
    { groupId: selectedGroup }
  );

  const content = selectedGroup ? groupContent : allContent;
  const contentLoading = selectedGroup ? groupContentLoading : allContentLoading;

  // Get all feature services for clickray analysis
  const featureServices = useMemo(() => {
    if (!allContent) return [];
    return allContent.filter((item) => item.type === 'Feature Service');
  }, [allContent]);

  // Analyze all feature services for clickrays
  const {
    data: clickrayAnalysis,
    isLoading: clickrayLoading,
    isPaused: clickrayPaused,
    progress: clickrayProgress,
    pause: pauseClickrayAnalysis,
    resume: resumeClickrayAnalysis,
    stop: stopClickrayAnalysis,
    rerun: rerunClickrayAnalysis,
  } = useClickrayAnalysis(token, featureServices);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!content) return {};

    const featureServicesCount = content.filter((i) => i.type === 'Feature Service').length;
    const geodatabases = content.filter((i) =>
      i.type?.includes('Geodatabase')
    ).length;
    const sceneLayers = content.filter((i) => i.type === 'Scene Service').length;
    const imageServices = content.filter(
      (i) => i.type === 'Image Service'
    ).length;

    // Aggregate from loaded service stats
    let totalFeatures = 0;
    let totalLayers = 0;

    Object.values(serviceStatsMap).forEach((stats) => {
      totalFeatures += stats.totalFeatures || 0;
      totalLayers += (stats.layerCount || 0) + (stats.tableCount || 0);
    });

    return {
      totalFeatures,
      totalServices: featureServicesCount,
      totalLayers,
      totalClickrays: clickrayAnalysis?.totalClickrays || 0,
      geodatabases,
      sceneLayers,
      imageServices,
    };
  }, [content, serviceStatsMap, clickrayAnalysis]);

  const handleStatsUpdate = useCallback((statsMap) => {
    setServiceStatsMap(statsMap);
  }, []);

  const handleArchiveSelected = useCallback((items) => {
    setArchiveItems(items);
    setShowArchiveModal(true);
  }, []);

  const handleArchiveClose = useCallback(() => {
    setShowArchiveModal(false);
    setArchiveItems([]);
  }, []);

  const handleArchiveComplete = useCallback((archives) => {
    // Refresh content after archiving
    console.log('Archive complete:', archives);
    // Could trigger a refetch of content here if needed
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} isLoading={loading} error={error} />;
  }

  const header = (
    <div className="flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900">
          ArcGIS Dashboard
        </h1>
        <span className="text-sm text-gray-500">{org?.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.username}</span>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  const sidebar = (
    <GroupList
      groups={groups}
      token={token}
      selectedGroup={selectedGroup}
      onSelectGroup={setSelectedGroup}
      isLoading={groupsLoading}
    />
  );

  return (
    <AppLayout header={header} sidebar={sidebar}>
      <SummaryDashboard stats={summaryStats} />
      <div className="mt-4">
        <ClickrayAnalysis
          analysis={clickrayAnalysis}
          isLoading={clickrayLoading}
          isPaused={clickrayPaused}
          progress={clickrayProgress}
          onPause={pauseClickrayAnalysis}
          onResume={resumeClickrayAnalysis}
          onStop={stopClickrayAnalysis}
          onRerun={rerunClickrayAnalysis}
        />
      </div>
      <div className="mt-4">
        <ContentTable
          items={content}
          token={token}
          isLoading={contentLoading}
          onStatsUpdate={handleStatsUpdate}
          onArchiveSelected={handleArchiveSelected}
        />
      </div>

      {showArchiveModal && (
        <ArchiveModal
          items={archiveItems}
          token={token}
          onClose={handleArchiveClose}
          onComplete={handleArchiveComplete}
        />
      )}
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
