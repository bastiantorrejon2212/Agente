import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { SidebarADN } from './components/SidebarADN';
import { NavigationTabs } from './components/NavigationTabs';
import { TabHooks } from './components/tabs/TabHooks';
import { TabScriptArchitect } from './components/tabs/TabScriptArchitect';
import { TabDraftAuditor } from './components/tabs/TabDraftAuditor';
import { TabRoughCut } from './components/tabs/TabRoughCut';
import { TabFinalQuality } from './components/tabs/TabFinalQuality';
import { TabSEO } from './components/tabs/TabSEO';
import { TabBovedaKanban } from './components/tabs/TabBovedaKanban';
import { TeleprompterModal } from './components/TeleprompterModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ToastContainer } from './components/ToastContainer';
import { ContentAdvisorModal } from './components/ContentAdvisorModal';

const MainLayout: React.FC = () => {
  const { activeTab } = useApp();

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'hooks':
        return <TabHooks />;
      case 'script':
        return <TabScriptArchitect />;
      case 'audit':
        return <TabDraftAuditor />;
      case 'rough_cut':
        return <TabRoughCut />;
      case 'final_quality':
        return <TabFinalQuality />;
      case 'seo':
        return <TabSEO />;
      case 'boveda':
        return <TabBovedaKanban />;
      default:
        return <TabHooks />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-violet-600 selection:text-white">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Left ADN Panel */}
        <SidebarADN />

        {/* Tab Viewport */}
        <main className="flex-1 flex flex-col h-[calc(100vh-57px)] overflow-y-auto">
          {/* Segmented Navigation Bar */}
          <NavigationTabs />

          {/* Dynamic Active Tab Content */}
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            {renderActiveTabContent()}
          </div>
        </main>
      </div>

      {/* Modals & Portals */}
      <TeleprompterModal />
      <ApiKeyModal />
      <ContentAdvisorModal />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
