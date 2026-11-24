import React, { useEffect, useMemo, useState } from 'react';
import ChartsSection from './components/ChartsSection.jsx';
import InsightsSection from './components/InsightsSection.jsx';
import LoginPage from './components/LoginPage.jsx';
import Navbar from './components/Navbar.jsx';
import NungMeawMascot from './components/NungMeawMascot.jsx';
import OverviewSection from './components/OverviewSection.jsx';
import PrintReportPortal from './components/PrintReportPortal.jsx';
import TimeReportSection from './components/TimeReportSection.jsx';
import UnitReportSection from './components/UnitReportSection.jsx';
import {
  fetchAndStoreLiveDataset,
  loadInitialDataset,
} from './services/sheetService.js';
import { computeAnalytics, extractFiscalYears } from './utils/analyticsEngine.js';
import { clearSession, getActiveSession } from './utils/authCrypto.js';
import { DAILY_THEMES, getBangkokDayOfWeek } from './utils/thaiTime.js';

const COLOR_MODE_KEY = 'nkp_pcu_color_mode';
const THEME_PREF_KEY = 'nkp_pcu_theme_pref';

export default function App() {
  const [session, setSession] = useState(() => getActiveSession());
  const [dataset, setDataset] = useState(() => loadInitialDataset());
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('ALL');
  const [datasetMode, setDatasetMode] = useState('ALL');
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedUnitDetail, setSelectedUnitDetail] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const [colorMode, setColorMode] = useState(() => {
    try {
      return localStorage.getItem(COLOR_MODE_KEY) || 'light';
    } catch {
      return 'light';
    }
  });

  const [themePreference, setThemePreference] = useState(() => {
    try {
      return localStorage.getItem(THEME_PREF_KEY) || 'auto';
    } catch {
      return 'auto';
    }
  });

  const bangkokDayIndex = useMemo(() => getBangkokDayOfWeek(new Date()), []);
  const todayThemeInfo = DAILY_THEMES[bangkokDayIndex] || DAILY_THEMES[2];

  useEffect(() => {
    const dayThemeAttr = themePreference === 'auto' ? String(bangkokDayIndex) : 'pink';
    document.documentElement.setAttribute('data-day-theme', dayThemeAttr);
    document.documentElement.setAttribute('data-color-mode', colorMode);
    try {
      localStorage.setItem(COLOR_MODE_KEY, colorMode);
      localStorage.setItem(THEME_PREF_KEY, themePreference);
    } catch {
      // ignore
    }
  }, [colorMode, themePreference, bangkokDayIndex]);

  const fiscalYears = useMemo(
    () => extractFiscalYears(dataset.allRecords),
    [dataset.allRecords]
  );

  const analytics = useMemo(() => {
    return computeAnalytics(dataset.allRecords, {
      fiscalYear: selectedFiscalYear,
      datasetMode,
    });
  }, [dataset.allRecords, selectedFiscalYear, datasetMode]);

  function handleNavigateTab(tab) {
    setActiveTab(tab);
    window.scrollTo(0, 0);
  }

  function handleToggleColorMode() {
    setColorMode((m) => (m === 'light' ? 'dark' : 'light'));
  }

  function handleToggleThemePreference() {
    setThemePreference((p) => (p === 'auto' ? 'pink' : 'auto'));
  }

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  async function handleSyncNow() {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const res = await fetchAndStoreLiveDataset();
      if (res.ok && res.dataset) {
        setDataset(res.dataset);
        setSyncNotice({
          type: 'success',
          text: `ดึงข้อมูลล่าสุดเรียบร้อยแล้ว (${res.dataset.lastUpdatedLabel})`,
        });
      } else if (res.notConfigured) {
        setSyncNotice({
          type: 'warning',
          text: res.message,
        });
      }
    } catch (err) {
      setSyncNotice({
        type: 'danger',
        text: err?.message || 'เกิดข้อผิดพลาดระหว่างดึงข้อมูล กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSyncing(false);
    }
  }

  function handleSelectUnitFromAnywhere(unitName) {
    setActiveTab('units');
    setSelectedUnitDetail(unitName);
    window.scrollTo(0, 0);
  }

  if (!session) {
    return (
      <LoginPage
        onLoginSuccess={setSession}
        colorMode={colorMode}
        onToggleColorMode={handleToggleColorMode}
        themePreference={themePreference}
        onToggleThemePreference={handleToggleThemePreference}
        todayThemeInfo={todayThemeInfo}
      />
    );
  }

  return (
    <div className="min-vh-100 pb-5">
      <Navbar
        username={session.username}
        fiscalYears={fiscalYears}
        selectedFiscalYear={selectedFiscalYear}
        onChangeFiscalYear={setSelectedFiscalYear}
        datasetMode={datasetMode}
        onChangeDatasetMode={setDatasetMode}
        lastUpdatedLabel={dataset.lastUpdatedLabel}
        sourceType={dataset.sourceType}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        onOpenPrint={() => setIsPrintOpen(true)}
        colorMode={colorMode}
        onToggleColorMode={handleToggleColorMode}
        themePreference={themePreference}
        onToggleThemePreference={handleToggleThemePreference}
        todayThemeInfo={todayThemeInfo}
        onLogout={handleLogout}
      />

      <main className="container-fluid px-3 px-lg-4">
        {syncNotice && (
          <div
            className={`alert alert-${syncNotice.type} alert-dismissible fade show rounded-4 shadow-sm mb-3`}
            role="alert"
          >
            <i className="bi bi-info-circle-fill me-2" />
            {syncNotice.text}
            <button
              type="button"
              className="btn-close"
              onClick={() => setSyncNotice(null)}
              aria-label="ปิดการแจ้งเตือน"
            />
          </div>
        )}

        {/* Navigation Tabs + Active Theme Pill */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <ul className="nav nav-pills nav-pills-pastel gap-2">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleNavigateTab('overview')}
              >
                <i className="bi bi-grid-1x2-fill me-2" />
                ภาพรวมและกราฟวิเคราะห์
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'units' ? 'active' : ''}`}
                onClick={() => handleNavigateTab('units')}
              >
                <i className="bi bi-hospital-fill me-2" />
                ราย รพ.สต. ({analytics.byUnit.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'time' ? 'active' : ''}`}
                onClick={() => handleNavigateTab('time')}
              >
                <i className="bi bi-calendar-range-fill me-2" />
                รายวัน / เดือน / ไตรมาส
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'insights' ? 'active' : ''}`}
                onClick={() => handleNavigateTab('insights')}
              >
                <i className="bi bi-lightbulb-fill me-2" />
                สรุปผลและแนวทางดำเนินงาน
              </button>
            </li>
          </ul>

          <div className="badge badge-pastel px-3 py-2">
            <i className="bi bi-stars me-1" />
            {themePreference === 'auto'
              ? `ธีมอัตโนมัติ: ${todayThemeInfo.name}`
              : 'ธีมชมพูอ่อนพาสเทล'}
          </div>
        </div>

        {/* Always show KPI summary strip on Overview, and render active section */}
        {activeTab === 'overview' && (
          <>
            <OverviewSection
              summary={analytics.summary}
              entitlementSummary={analytics.entitlementSummary}
              labModes={analytics.labModes}
              drugModes={analytics.drugModes}
            />
            <ChartsSection
              analytics={analytics}
              colorMode={colorMode}
              onSelectUnit={handleSelectUnitFromAnywhere}
            />
          </>
        )}

        {activeTab === 'units' && (
          <UnitReportSection
            byUnit={analytics.byUnit}
            selectedUnitDetail={selectedUnitDetail}
            onSelectUnitDetail={setSelectedUnitDetail}
            searchQuery={unitSearch}
            onChangeSearchQuery={setUnitSearch}
          />
        )}

        {activeTab === 'time' && (
          <TimeReportSection
            byDay={analytics.byDay}
            byMonth={analytics.byMonth}
            byQuarter={analytics.byQuarter}
            byFiscalYear={analytics.byFiscalYear}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsSection
            insights={analytics.insights}
            summary={analytics.summary}
            byUnit={analytics.byUnit}
          />
        )}
      </main>

      <NungMeawMascot
        analytics={analytics}
        sourceType={dataset.sourceType}
        onSelectUnitFromMascot={handleSelectUnitFromAnywhere}
        onOpenPrint={() => setIsPrintOpen(true)}
        onSyncNow={handleSyncNow}
        onToggleColorMode={handleToggleColorMode}
        onToggleThemePreference={handleToggleThemePreference}
        onNavigateTab={handleNavigateTab}
      />

      <PrintReportPortal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        allRecords={dataset.allRecords}
        selectedFiscalYear={selectedFiscalYear}
        fiscalYears={fiscalYears}
        lastUpdatedLabel={dataset.lastUpdatedLabel}
      />
    </div>
  );
}
