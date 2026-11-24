import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AboutSection from './components/AboutSection.jsx';
import ChartsSection from './components/ChartsSection.jsx';
import DeepAnalyticsSection from './components/DeepAnalyticsSection.jsx';
import FilterBar from './components/FilterBar.jsx';
import InsightsSection from './components/InsightsSection.jsx';
import LoginPage from './components/LoginPage.jsx';
import Navbar from './components/Navbar.jsx';
import NungMeawMascot from './components/NungMeawMascot.jsx';
import OverviewSection from './components/OverviewSection.jsx';
import PrintReportPortal from './components/PrintReportPortal.jsx';
import TimeReportSection from './components/TimeReportSection.jsx';
import UnitReportSection from './components/UnitReportSection.jsx';
import {
  clearCachedDataset,
  createEmptyDataset,
  fetchAndStoreLiveDataset,
  getRemainingCacheMinutes,
  loadInitialDataset,
} from './services/sheetService.js';
import {
  computeAnalytics,
  extractFiscalYears,
  extractServiceModes,
} from './utils/analyticsEngine.js';
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
  const [selectedQuarter, setSelectedQuarter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedServiceMode, setSelectedServiceMode] = useState('ALL');
  const [selectedEntitlement, setSelectedEntitlement] = useState('ALL');
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedUnitDetail, setSelectedUnitDetail] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(() =>
    getRemainingCacheMinutes(dataset.expiresAt)
  );

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

  const initialSyncTriggeredRef = useRef(false);
  const syncRequestSeqRef = useRef(0);

  const bangkokDayIndex = useMemo(() => getBangkokDayOfWeek(new Date()), []);
  const todayThemeInfo = DAILY_THEMES[bangkokDayIndex] || DAILY_THEMES[2];

  const fiscalYears = useMemo(
    () => extractFiscalYears(dataset.allRecords),
    [dataset.allRecords]
  );

  const serviceModes = useMemo(
    () => extractServiceModes(dataset.allRecords),
    [dataset.allRecords]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedQuarter !== 'ALL') count += 1;
    if (selectedMonth !== 'ALL') count += 1;
    if (dateStart) count += 1;
    if (dateEnd) count += 1;
    if (selectedServiceMode !== 'ALL') count += 1;
    if (selectedEntitlement !== 'ALL') count += 1;
    return count;
  }, [
    selectedQuarter,
    selectedMonth,
    dateStart,
    dateEnd,
    selectedServiceMode,
    selectedEntitlement,
  ]);

  const analytics = useMemo(() => {
    return computeAnalytics(dataset.allRecords, {
      fiscalYear: selectedFiscalYear,
      datasetMode,
      quarter: selectedQuarter,
      month: selectedMonth,
      dateStart,
      dateEnd,
      serviceMode: selectedServiceMode,
      entitlementKey: selectedEntitlement,
    });
  }, [
    dataset.allRecords,
    selectedFiscalYear,
    datasetMode,
    selectedQuarter,
    selectedMonth,
    dateStart,
    dateEnd,
    selectedServiceMode,
    selectedEntitlement,
  ]);

  const handleSyncNow = useCallback(async () => {
    const reqId = ++syncRequestSeqRef.current;
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const res = await fetchAndStoreLiveDataset();
      // ป้องกันกรณีผู้ใช้กดออกจากระบบระหว่างรอผลดึงข้อมูล: ให้ล้างข้อมูลที่เพิ่งดึงมาออกทันที
      if (reqId !== syncRequestSeqRef.current || !getActiveSession()) {
        clearCachedDataset();
        return;
      }
      if (res.ok && res.dataset) {
        setDataset(res.dataset);
        setRemainingMinutes(getRemainingCacheMinutes(res.dataset.expiresAt));
        setSyncNotice({
          type: 'success',
          text: `ดึงข้อมูลล่าสุดเรียบร้อยแล้ว (${res.dataset.lastUpdatedLabel}) — ข้อมูลชั่วคราวจะถูกล้างอัตโนมัติใน 60 นาที`,
        });
      } else if (res.notConfigured) {
        setSyncNotice({
          type: 'warning',
          text: res.message,
        });
      }
    } catch (err) {
      if (reqId !== syncRequestSeqRef.current || !getActiveSession()) return;
      setSyncNotice({
        type: 'danger',
        text: err?.message || 'เกิดข้อผิดพลาดระหว่างดึงข้อมูล กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      if (reqId === syncRequestSeqRef.current) {
        setIsSyncing(false);
      }
    }
  }, []);

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

  // ดึงข้อมูลล่าสุดอัตโนมัติเมื่อเปิดหน้าครั้งแรกใน Session ที่ยังไม่มีข้อมูล
  useEffect(() => {
    if (session && !initialSyncTriggeredRef.current) {
      initialSyncTriggeredRef.current = true;
      if (dataset.sourceType !== 'live') {
        handleSyncNow();
      }
    }
  }, [session, dataset.sourceType, handleSyncNow]);

  // ตรวจสอบอายุข้อมูลชั่วคราวบนเครื่องทุก 30 วินาที (ครบ 60 นาทีล้างทันที)
  useEffect(() => {
    if (!session || !dataset.expiresAt) {
      setRemainingMinutes(0);
      return undefined;
    }

    setRemainingMinutes(getRemainingCacheMinutes(dataset.expiresAt));

    const timer = setInterval(() => {
      if (!getActiveSession()) {
        clearCachedDataset();
        setDataset(createEmptyDataset());
        setRemainingMinutes(0);
        clearSession();
        setSession(null);
        return;
      }
      if (Date.now() >= dataset.expiresAt) {
        clearCachedDataset();
        setDataset(createEmptyDataset());
        setRemainingMinutes(0);
        setSyncNotice({
          type: 'warning',
          text: 'ข้อมูลชั่วคราวบนเครื่องครบอายุการใช้งาน 60 นาทีและถูกล้างออกอัตโนมัติแล้ว กรุณากด "ดึงข้อมูลล่าสุด" เพื่อใช้งานต่อ',
        });
      } else {
        setRemainingMinutes(getRemainingCacheMinutes(dataset.expiresAt));
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [session, dataset.expiresAt]);

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

  function handleLoginSuccess(newSession) {
    initialSyncTriggeredRef.current = true;
    setSession(newSession);
    handleSyncNow();
  }

  function handleLogout() {
    syncRequestSeqRef.current += 1;
    clearCachedDataset();
    setDataset(createEmptyDataset());
    setRemainingMinutes(0);
    setIsSyncing(false);
    setSyncNotice(null);
    initialSyncTriggeredRef.current = false;
    clearSession();
    setSession(null);
  }

  function handleResetDeepFilters() {
    setSelectedQuarter('ALL');
    setSelectedMonth('ALL');
    setDateStart('');
    setDateEnd('');
    setSelectedServiceMode('ALL');
    setSelectedEntitlement('ALL');
  }

  function handleSelectUnitFromAnywhere(unitName) {
    setActiveTab('units');
    setSelectedUnitDetail(unitName);
    window.scrollTo(0, 0);
  }

  if (!session) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        colorMode={colorMode}
        onToggleColorMode={handleToggleColorMode}
        themePreference={themePreference}
        onToggleThemePreference={handleToggleThemePreference}
        todayThemeInfo={todayThemeInfo}
      />
    );
  }

  const hasNoData = dataset.allRecords.length === 0;

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
        remainingMinutes={remainingMinutes}
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
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <ul className="nav nav-pills nav-pills-pastel nav-pills-scroll w-100 w-xl-auto">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleNavigateTab('overview')}
              >
                <i className="bi bi-grid-1x2-fill me-1 me-md-2" />
                ภาพรวมและกราฟ
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'deep' ? 'active' : ''}`}
                onClick={() => handleNavigateTab('deep')}
              >
                <i className="bi bi-compass-fill me-1 me-md-2" />
                วิเคราะห์เชิงลึก
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'units' ? 'active' : ''}`}
                onClick={() => handleNavigateTab('units')}
              >
                <i className="bi bi-hospital-fill me-1 me-md-2" />
                ราย รพ.สต. ({analytics.byUnit.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'time' ? 'active' : ''}`}
                onClick={() => handleNavigateTab('time')}
              >
                <i className="bi bi-calendar-range-fill me-1 me-md-2" />
                รายวัน / เดือน / ไตรมาส
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'insights' ? 'active' : ''}`}
                onClick={() => handleNavigateTab('insights')}
              >
                <i className="bi bi-lightbulb-fill me-1 me-md-2" />
                สรุปผลและแนวทาง
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
                onClick={() => handleNavigateTab('about')}
              >
                <i className="bi bi-info-circle-fill me-1 me-md-2" />
                เกี่ยวกับระบบ
              </button>
            </li>
          </ul>

          <div className="badge badge-pastel px-3 py-2 d-none d-xl-inline-flex align-items-center">
            <i className="bi bi-stars me-1" />
            {themePreference === 'auto'
              ? `ธีมอัตโนมัติ: ${todayThemeInfo.name}`
              : 'ธีมชมพูอ่อนพาสเทล'}
          </div>
        </div>

        {/* Deep Filter Bar on Data Tabs */}
        {activeTab !== 'about' && !hasNoData && (
          <FilterBar
            quarter={selectedQuarter}
            onChangeQuarter={setSelectedQuarter}
            month={selectedMonth}
            onChangeMonth={setSelectedMonth}
            dateStart={dateStart}
            onChangeDateStart={setDateStart}
            dateEnd={dateEnd}
            onChangeDateEnd={setDateEnd}
            serviceMode={selectedServiceMode}
            onChangeServiceMode={setSelectedServiceMode}
            serviceModes={serviceModes}
            entitlementKey={selectedEntitlement}
            onChangeEntitlementKey={setSelectedEntitlement}
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetDeepFilters}
          />
        )}

        {/* Loading or Empty Data State on Data Tabs */}
        {activeTab !== 'about' && hasNoData ? (
          <div className="pastel-card p-5 text-center my-4">
            {isSyncing ? (
              <>
                <div className="spinner-border text-accent mb-3" role="status" />
                <h2 className="h5 fw-bold mb-1">กำลังดึงข้อมูลล่าสุดจากระบบต้นทาง...</h2>
                <p className="small text-muted-theme mb-0">
                  กรุณารอสักครู่ ระบบกำลังจัดเตรียมข้อมูลและประมวลผลตัวชี้วัดทั้งหมด
                </p>
              </>
            ) : (
              <>
                <i className="bi bi-cloud-slash fs-1 text-accent d-block mb-2" />
                <h2 className="h5 fw-bold mb-1">ยังไม่มีข้อมูลที่ดึงไว้ในรอบการใช้งานนี้</h2>
                <p className="small text-muted-theme mb-3">
                  ระบบไม่ได้เก็บข้อมูลตัวอย่างหรือข้อมูลค้างไว้บนเครื่อง กดปุ่มด้านล่างเพื่อดึงข้อมูลล่าสุด
                </p>
                <button type="button" className="btn btn-pastel-primary px-4" onClick={handleSyncNow}>
                  <i className="bi bi-cloud-arrow-down-fill me-2" />
                  ดึงข้อมูลล่าสุดเดี๋ยวนี้
                </button>
              </>
            )}
          </div>
        ) : (
          <>
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

            {activeTab === 'deep' && (
              <DeepAnalyticsSection
                analytics={analytics}
                colorMode={colorMode}
                onSelectUnit={handleSelectUnitFromAnywhere}
              />
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
          </>
        )}

        {activeTab === 'about' && (
          <AboutSection
            lastUpdatedLabel={dataset.lastUpdatedLabel}
            sourceType={dataset.sourceType}
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
