import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar, MainNavId } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { ToastContainer } from './components/common/ToastContainer';
import { InstallGuideModal } from './components/pwa/InstallGuideModal';
import { DatabaseStatusModal } from './components/common/DatabaseStatusModal';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { JamaahView } from './views/JamaahView';
import { RombonganView } from './views/RombonganView';
import { BusView } from './views/BusView';
import { SeatEditorView } from './views/SeatEditorView';
import { PaymentsView } from './views/PaymentsView';
import { BudgetExpensesView } from './views/BudgetExpensesView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';

const AppMain: React.FC = () => {
  const { isAuthenticated } = useApp();

  const [activeTab, setActiveTab] = useState<MainNavId>('dashboard');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [targetBusForSeat, setTargetBusForSeat] = useState<string | undefined>(undefined);

  // If not authenticated, show modern Admin Login view
  if (!isAuthenticated) {
    return (
      <>
        <AuthView
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          onOpenDbModal={() => setIsDbModalOpen(true)}
        />
        <InstallGuideModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />
        <DatabaseStatusModal
          isOpen={isDbModalOpen}
          onClose={() => setIsDbModalOpen(false)}
        />
        <ToastContainer />
      </>
    );
  }

  const navigateToSeatsForBus = (busId: string) => {
    setTargetBusForSeat(busId);
    setActiveTab('seats');
  };

  return (
    <div className="min-h-screen flex bg-offwhite">
      {/* Desktop & Mobile Drawer Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          onOpenDbModal={() => setIsDbModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
          {activeTab === 'jamaah' && <JamaahView />}
          {activeTab === 'rombongan' && <RombonganView />}
          {activeTab === 'buses' && <BusView onNavigateToSeats={navigateToSeatsForBus} />}
          {activeTab === 'seats' && <SeatEditorView initialBusId={targetBusForSeat} />}
          {activeTab === 'payments' && <PaymentsView />}
          {activeTab === 'budget' && <BudgetExpensesView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && (
            <SettingsView
              onOpenInstallModal={() => setIsInstallModalOpen(true)}
              onOpenDbModal={() => setIsDbModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenMore={() => setMobileDrawerOpen(true)}
      />

      {/* Global Modals & Notifications */}
      <InstallGuideModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
      <DatabaseStatusModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppMain />
    </AppProvider>
  );
};

export default App;
