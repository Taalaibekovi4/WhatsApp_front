import React, { useEffect, useMemo, useRef, useState } from "react";
import { months } from "../../Constants/constants";
import { useClientsStore } from "../../../store/clients";
import "./ClientsDuplicates.scss";

/* ========= Levenshtein ========= */
const levenshteinDistance = (a, b) => {
  const aa = String(a || "");
  const bb = String(b || "");
  const m = aa.length, n = bb.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[0][i] = i;
  for (let j = 0; j <= n; j++) dp[j][0] = j;
  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      const cost = aa[i - 1] === bb[j - 1] ? 0 : 1;
      dp[j][i] = Math.min(dp[j - 1][i] + 1, dp[j][i - 1] + 1, dp[j - 1][i - 1] + cost);
    }
  }
  return dp[n][m];
};

const YEARS = ["2025", "2026"];
const PAGE_GROUP = 10;

/* ========= Чистый Select (только выбор, прокрутка списка) ========= */
const Select = ({ value, onChange, options, placeholder, ariaLabel, idSuffix }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const listId = `clients-duplicates-${idSuffix}-list`;

  return (
    <div className="clients-duplicates__select" ref={rootRef}>
      <button
        type="button"
        className={`clients-duplicates__select-trigger ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((s) => !s)}
      >
        <span className={`clients-duplicates__select-value ${value ? "" : "is-placeholder"}`}>
          {value || placeholder}
        </span>
        <span className="clients-duplicates__select-caret">▾</span>
      </button>

      {open && (
        <div className="clients-duplicates__select-popover" role="listbox" id={listId}>
          <div className="clients-duplicates__select-list">
            {options.map((opt) => (
              <div
                key={opt}
                role="option"
                aria-selected={String(value) === String(opt)}
                className={`clients-duplicates__select-item ${
                  String(value) === String(opt) ? "is-active" : ""
                }`}
                onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ========= Основной компонент ========= */
const ClientsDuplicates = () => {
  const { items, load, loading, error } = useClientsStore();

  const [month, setMonth] = useState("");
  const [year, setYear] = useState(YEARS[0]);

  const [expandedExact, setExpandedExact] = useState(null);
  const [expandedSimilar, setExpandedSimilar] = useState(null);

  const [pageExact, setPageExact] = useState(1);
  const [pageSimilar, setPageSimilar] = useState(1);

  useEffect(() => { load?.(); }, [load]);

  const { exactGroups, similarGroups } = useMemo(() => {
    if (!month || !year) return { exactGroups: [], similarGroups: [] };
    const filtered = (items || []).filter(
      (c) => String(c.month) === String(month) && String(c.year) === String(year)
    );

    // Точные (name + sport)
    const map = new Map();
    for (const c of filtered) {
      const k = `${String(c.name || "").trim().toLowerCase()}|${String(c.sport_category || "").trim().toLowerCase()}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(c);
    }
    const exact = Array.from(map.values())
      .filter((arr) => arr.length > 1)
      .map((arr) => ({
        key: `${arr[0].name}|${arr[0].sport_category}`,
        name: arr[0].name,
        sport_category: arr[0].sport_category,
        clients: arr,
      }));

    // Похожие имена в рамках одного спорта (distance = 1)
    const sim = [];
    const used = new Set();
    for (let i = 0; i < filtered.length; i++) {
      const a = filtered[i];
      const ka = `${String(a.name).toLowerCase()}|${String(a.sport_category).toLowerCase()}`;
      if (used.has(ka)) continue;
      const group = [a];
      for (let j = i + 1; j < filtered.length; j++) {
        const b = filtered[j];
        if (String(a.sport_category).toLowerCase() !== String(b.sport_category).toLowerCase()) continue;
        const kb = `${String(b.name).toLowerCase()}|${String(b.sport_category).toLowerCase()}`;
        if (used.has(kb)) continue;
        if (
          a.name && b.name &&
          a.name.toLowerCase() !== b.name.toLowerCase() &&
          levenshteinDistance(a.name.toLowerCase(), b.name.toLowerCase()) === 1
        ) {
          group.push(b);
          used.add(kb);
        }
      }
      if (group.length > 1) {
        sim.push({
          key: `${group.map((x) => x.name).join(",")}|${a.sport_category}`,
          names: group.map((x) => x.name).join(", "),
          sport_category: a.sport_category,
          clients: group,
        });
        used.add(ka);
      }
    }

    return { exactGroups: exact, similarGroups: sim };
  }, [items, month, year]);

  // сброс раскрытых блоков и страниц при смене периода
  useEffect(() => {
    setExpandedExact(null);
    setExpandedSimilar(null);
    setPageExact(1);
    setPageSimilar(1);
  }, [month, year]);

  const totalExactPages = Math.max(1, Math.ceil(exactGroups.length / PAGE_GROUP));
  const totalSimilarPages = Math.max(1, Math.ceil(similarGroups.length / PAGE_GROUP));

  useEffect(() => { if (pageExact > totalExactPages) setPageExact(totalExactPages); }, [pageExact, totalExactPages]);
  useEffect(() => { if (pageSimilar > totalSimilarPages) setPageSimilar(totalSimilarPages); }, [pageSimilar, totalSimilarPages]);

  const exactPageItems = useMemo(() => {
    const start = (pageExact - 1) * PAGE_GROUP;
    return exactGroups.slice(start, start + PAGE_GROUP);
  }, [exactGroups, pageExact]);

  const similarPageItems = useMemo(() => {
    const start = (pageSimilar - 1) * PAGE_GROUP;
    return similarGroups.slice(start, start + PAGE_GROUP);
  }, [similarGroups, pageSimilar]);

  const pageNums = (page, total) => {
    const max = 7;
    const arr = [];
    let s = Math.max(1, page - 3);
    let e = Math.min(total, s + max - 1);
    if (e - s + 1 < max) s = Math.max(1, e - max + 1);
    for (let i = s; i <= e; i++) arr.push(i);
    return arr;
  };

  return (
    <div className="clients-duplicates">
      <div className="clients-duplicates__filters">
        <div className="clients-duplicates__filter">
          <label className="clients-duplicates__label">Год</label>
          <Select
            value={year}
            onChange={setYear}
            options={YEARS}
            placeholder="Выберите год"
            ariaLabel="Год"
            idSuffix="year"
          />
        </div>
        <div className="clients-duplicates__filter">
          <label className="clients-duplicates__label">Месяц</label>
          <Select
            value={month}
            onChange={setMonth}
            options={months}
            placeholder="Выберите месяц"
            ariaLabel="Месяц"
            idSuffix="month"
          />
        </div>
      </div>

      {loading ? (
        <div className="clients-duplicates__spinner" aria-label="Загрузка..." />
      ) : error ? (
        <p className="clients-duplicates__error" role="alert">{error}</p>
      ) : !month || !year ? (
        <p className="clients-duplicates__hint">Выберите месяц и год.</p>
      ) : (
        <div className="clients-duplicates__results">
          {/* ===== Точные ===== */}
          <section className="clients-duplicates__section">
            <h3 className="clients-duplicates__subtitle">
              Точные дубликаты <span className="clients-duplicates__count">({exactGroups.length})</span>
            </h3>

            {exactGroups.length === 0 ? (
              <p className="clients-duplicates__empty">Точных дубликатов не найдено.</p>
            ) : (
              <>
                <ul className="clients-duplicates__list">
                  {exactPageItems.map((group, idx) => {
                    const gKey = `exact-${group.key}-${idx + (pageExact - 1) * PAGE_GROUP}`;
                    const open = expandedExact === gKey;
                    return (
                      <li key={gKey} className="clients-duplicates__item">
                        <button
                          type="button"
                          className={`clients-duplicates__cardHeader ${open ? "is-open" : ""}`}
                          onClick={() => setExpandedExact(open ? null : gKey)}
                          aria-expanded={open}
                        >
                          <span className="clients-duplicates__cardTitle">
                            {group.name} <span className="clients-duplicates__sport">({group.sport_category})</span>
                          </span>
                          <span className="clients-duplicates__badge">{group.clients.length}</span>
                          <span className="clients-duplicates__caret">{open ? "▴" : "▾"}</span>
                        </button>

                        {open && (
                          <ul className="clients-duplicates__sublist">
                            {group.clients.map((c) => (
                              <li key={c.id} className="clients-duplicates__subitem">
                                <span className="clients-duplicates__subname">{c.name}</span>
                                <span className="clients-duplicates__muted">
                                  Тренер: {c.trainer || "—"} • Тип: {c.typeClient || "—"} • Источник: {c.check_field || "—"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {exactGroups.length > PAGE_GROUP && (
                  <div className="clients-duplicates__pagination" role="navigation" aria-label="Пагинация точных">
                    <button className="clients-duplicates__pageBtn" onClick={() => setPageExact(1)} disabled={pageExact === 1}>«</button>
                    <button className="clients-duplicates__pageBtn" onClick={() => setPageExact((p) => Math.max(1, p - 1))} disabled={pageExact === 1}>‹</button>
                    {pageNums(pageExact, totalExactPages).map((n) => (
                      <button key={`ex-${n}`} className={`clients-duplicates__pageBtn ${n === pageExact ? "is-active" : ""}`} onClick={() => setPageExact(n)}>{n}</button>
                    ))}
                    <button className="clients-duplicates__pageBtn" onClick={() => setPageExact((p) => Math.min(totalExactPages, p + 1))} disabled={pageExact === totalExactPages}>›</button>
                    <button className="clients-duplicates__pageBtn" onClick={() => setPageExact(totalExactPages)} disabled={pageExact === totalExactPages}>»</button>
                    <span className="clients-duplicates__pageInfo">{pageExact} / {totalExactPages}</span>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ===== Похожие ===== */}
          <section className="clients-duplicates__section">
            <h3 className="clients-duplicates__subtitle">
              Похожие имена <span className="clients-duplicates__count">({similarGroups.length})</span>
            </h3>

            {similarGroups.length === 0 ? (
              <p className="clients-duplicates__empty">Похожих имён не найдено.</p>
            ) : (
              <>
                <ul className="clients-duplicates__list">
                  {similarPageItems.map((group, idx) => {
                    const gKey = `similar-${group.key}-${idx + (pageSimilar - 1) * PAGE_GROUP}`;
                    const open = expandedSimilar === gKey;
                    return (
                      <li key={gKey} className="clients-duplicates__item">
                        <button
                          type="button"
                          className={`clients-duplicates__cardHeader ${open ? "is-open" : ""}`}
                          onClick={() => setExpandedSimilar(open ? null : gKey)}
                          aria-expanded={open}
                        >
                          <span className="clients-duplicates__cardTitle">
                            {group.names} <span className="clients-duplicates__sport">({group.sport_category})</span>
                          </span>
                          <span className="clients-duplicates__badge">{group.clients.length}</span>
                          <span className="clients-duplicates__caret">{open ? "▴" : "▾"}</span>
                        </button>

                        {open && (
                          <ul className="clients-duplicates__sublist">
                            {group.clients.map((c) => (
                              <li key={c.id} className="clients-duplicates__subitem">
                                <span className="clients-duplicates__subname">{c.name}</span>
                                <span className="clients-duplicates__muted">
                                  Тренер: {c.trainer || "—"} • Тип: {c.typeClient || "—"} • Источник: {c.check_field || "—"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {similarGroups.length > PAGE_GROUP && (
                  <div className="clients-duplicates__pagination" role="navigation" aria-label="Пагинация похожих">
                    <button className="clients-duplicates__pageBtn" onClick={() => setPageSimilar(1)} disabled={pageSimilar === 1}>«</button>
                    <button className="clients-duplicates__pageBtn" onClick={() => setPageSimilar((p) => Math.max(1, p - 1))} disabled={pageSimilar === 1}>‹</button>
                    {pageNums(pageSimilar, totalSimilarPages).map((n) => (
                      <button key={`sm-${n}`} className={`clients-duplicates__pageBtn ${n === pageSimilar ? "is-active" : ""}`} onClick={() => setPageSimilar(n)}>{n}</button>
                    ))}
                    <button className="clients-duplicates__pageBtn" onClick={() => setPageSimilar((p) => Math.min(totalSimilarPages, p + 1))} disabled={pageSimilar === totalSimilarPages}>›</button>
                    <button className="clients-duplicates__pageBtn" onClick={() => setPageSimilar(totalSimilarPages)} disabled={pageSimilar === totalSimilarPages}>»</button>
                    <span className="clients-duplicates__pageInfo">{pageSimilar} / {totalSimilarPages}</span>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ClientsDuplicates;
