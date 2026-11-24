import React, { useMemo, useState } from 'react';
import { ENTITLEMENT_FIELDS } from '../utils/dataNormalizer.js';
import { formatThaiDate } from '../utils/thaiTime.js';

export default function UnitReportSection({
  byUnit,
  selectedUnitDetail,
  onSelectUnitDetail,
  searchQuery,
  onChangeSearchQuery,
}) {
  const [sortBy, setSortBy] = useState('totalPatients');
  const [sortDir, setSortDir] = useState('desc');

  const filteredUnits = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    const list = q
      ? byUnit.filter(
          (u) =>
            u.unitName.toLowerCase().includes(q) ||
            u.serviceModesList.some((m) => m.toLowerCase().includes(q))
        )
      : byUnit;

    return [...list].sort((a, b) => {
      if (sortBy === 'unitName') {
        return sortDir === 'asc'
          ? a.unitName.localeCompare(b.unitName, 'th')
          : b.unitName.localeCompare(a.unitName, 'th');
      }
      const va = a[sortBy] || 0;
      const vb = b[sortBy] || 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [byUnit, searchQuery, sortBy, sortDir]);

  function handleSort(col) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  const activeUnit = useMemo(() => {
    if (!selectedUnitDetail) return null;
    return byUnit.find((u) => u.unitName === selectedUnitDetail) || null;
  }, [byUnit, selectedUnitDetail]);

  return (
    <div className="pastel-card p-3 p-md-4 mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h5 fw-bold mb-1">
            <i className="bi bi-hospital-fill text-accent me-2" />
            รายงานวิเคราะห์รายหน่วยบริการ (รพ.สต. และเครือข่าย)
          </h2>
          <p className="small text-muted-theme mb-0">
            คลิกที่แถวของหน่วยบริการเพื่อดูรายละเอียดแยกรายครั้งและแนวโน้มของ รพ.สต. นั้น
          </p>
        </div>
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 260 }}>
          <div className="input-group input-group-sm">
            <span className="input-group-text rounded-start-pill bg-transparent">
              <i className="bi bi-search text-accent" />
            </span>
            <input
              type="text"
              className="form-control rounded-end-pill"
              placeholder="ค้นหาชื่อ รพ.สต. หรือลักษณะบริการ..."
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              className="btn btn-sm btn-pastel-soft"
              onClick={() => onChangeSearchQuery('')}
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle table-pastel mb-0">
          <thead>
            <tr>
              <th style={{ width: 52 }} className="text-center">
                #
              </th>
              <th role="button" onClick={() => handleSort('unitName')}>
                ชื่อหน่วยบริการ / รพ.สต. <i className="bi bi-arrow-down-up small" />
              </th>
              <th className="text-end" role="button" onClick={() => handleSort('totalPatients')}>
                รวม (ราย)
              </th>
              <th className="text-end" role="button" onClick={() => handleSort('totalSessions')}>
                ครั้ง
              </th>
              <th className="text-end" role="button" onClick={() => handleSort('labPatients')}>
                Lab (ราย)
              </th>
              <th className="text-end" role="button" onClick={() => handleSort('drugPatients')}>
                ยา (ราย)
              </th>
              {ENTITLEMENT_FIELDS.map((f) => (
                <th key={f.key} className="text-end small">
                  {f.shortLabel}
                </th>
              ))}
              <th className="text-center">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnits.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center py-4 text-muted-theme">
                  ไม่พบข้อมูลหน่วยบริการตามเงื่อนไขที่ค้นหา
                </td>
              </tr>
            ) : (
              filteredUnits.map((u, idx) => (
                <tr
                  key={u.unitName}
                  role="button"
                  onClick={() => onSelectUnitDetail(u.unitName)}
                >
                  <td className="text-center fw-semibold">{idx + 1}</td>
                  <td>
                    <div className="fw-semibold">{u.unitName}</div>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {u.serviceModesList.slice(0, 3).map((m) => (
                        <span key={m} className="badge badge-pastel" style={{ fontSize: '0.7rem' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-end fw-bold text-accent">
                    {u.totalPatients.toLocaleString()}
                  </td>
                  <td className="text-end">{u.totalSessions}</td>
                  <td className="text-end">{u.labPatients.toLocaleString()}</td>
                  <td className="text-end">{u.drugPatients.toLocaleString()}</td>
                  {ENTITLEMENT_FIELDS.map((f) => (
                    <td key={f.key} className="text-end small">
                      {u.entitlements[f.key] ? u.entitlements[f.key].toLocaleString() : '-'}
                    </td>
                  ))}
                  <td className="text-center">
                    <button
                      type="button"
                      className="btn btn-sm btn-pastel-soft px-2 py-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUnitDetail(u.unitName);
                      }}
                    >
                      <i className="bi bi-eye-fill" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Unit Detail Modal */}
      {activeUnit && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(18, 10, 22, 0.6)' }}
          onClick={() => onSelectUnitDetail(null)}
        >
          <div
            className="modal-dialog modal-xl modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-hospital text-accent me-2" />
                    {activeUnit.unitName}
                  </h5>
                  <div className="small text-muted-theme">
                    รวมทั้งหมด {activeUnit.totalPatients.toLocaleString()} ราย ({activeUnit.totalSessions} ครั้ง) | Lab{' '}
                    {activeUnit.labPatients.toLocaleString()} ราย | เบิกยา {activeUnit.drugPatients.toLocaleString()} ราย
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => onSelectUnitDetail(null)}
                />
              </div>
              <div className="modal-body">
                <div className="row g-2 mb-3">
                  {ENTITLEMENT_FIELDS.map((f) => (
                    <div className="col-6 col-md-3" key={f.key}>
                      <div className="p-2 rounded-3" style={{ background: 'var(--bg-surface-soft)' }}>
                        <div className="small text-muted-theme">{f.label}</div>
                        <div className="fw-bold">{activeUnit.entitlements[f.key].toLocaleString()} ราย</div>
                      </div>
                    </div>
                  ))}
                </div>

                <h6 className="fw-bold mb-2">ประวัติการสนับสนุนรายครั้ง ({activeUnit.records.length} รายการ)</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-pastel">
                    <thead>
                      <tr>
                        <th>วันที่ดำเนินการ</th>
                        <th>ประเภทงาน</th>
                        <th>ลักษณะบริการ</th>
                        <th className="text-end">UC นครพิงค์</th>
                        <th className="text-end">UC แม่สา</th>
                        <th className="text-end">UC ขะจาว</th>
                        <th className="text-end">ประกันสังคม</th>
                        <th className="text-end">ข้าราชการ</th>
                        <th className="text-end">ชำระเงินเอง</th>
                        <th className="text-end">ปัญหาสิทธิ์</th>
                        <th className="text-end">อนุเคราะห์</th>
                        <th className="text-end">รวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUnit.records.map((r) => (
                        <tr key={r.id}>
                          <td>{formatThaiDate(r.operationDate, true)}</td>
                          <td>
                            <span className="badge badge-pastel">{r.datasetLabel}</span>
                          </td>
                          <td className="small">{r.serviceMode}</td>
                          <td className="text-end">{r.entitlements.ucNkp || '-'}</td>
                          <td className="text-end">{r.entitlements.ucMaesa || '-'}</td>
                          <td className="text-end">{r.entitlements.ucKhajao || '-'}</td>
                          <td className="text-end">{r.entitlements.sso || '-'}</td>
                          <td className="text-end">{r.entitlements.civilServant || '-'}</td>
                          <td className="text-end">{r.entitlements.selfPay || '-'}</td>
                          <td className="text-end">{r.entitlements.statusProblem || '-'}</td>
                          <td className="text-end">{r.entitlements.welfare || '-'}</td>
                          <td className="text-end fw-bold">{r.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-pastel-primary px-4"
                  onClick={() => onSelectUnitDetail(null)}
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
