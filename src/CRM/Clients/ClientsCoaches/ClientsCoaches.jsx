import React, { useEffect, useMemo, useState } from "react";
import { trainers as trainersConst } from "../../Constants/constants";
import { useClientsStore } from "../../../store/clients";
import "./ClientsCoaches.scss";

const PAGE_SIZE = 12;
const norm = (v) => (v ?? "").toString().trim().toLowerCase();

const ClientsCoaches = () => {
  const { items, load, loading, error } = useClientsStore();

  const [trainerFilter, setTrainerFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => { load?.(); }, [load]);

  // тренер → уникальные виды спорта
  const baseItems = useMemo(() => {
    const arr = (items || []).filter((c) => c && c.trainer && c.sport_category);
    return trainersConst
      .map((t) => {
        const keyT = norm(t);
        const uniq = new Map();
        for (const c of arr) {
          if (norm(c.trainer) === keyT) {
            const keyS = norm(c.sport_category);
            if (keyS && !uniq.has(keyS)) uniq.set(keyS, c.sport_category);
          }
        }
        const sports = [...uniq.values()];
        return { trainer: t, count: sports.length, sports };
      })
      .filter((x) => x.count >= 2)
      .sort((a, b) => b.count - a.count || a.trainer.localeCompare(b.trainer));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = trainerFilter.trim().toLowerCase();
    if (!q) return baseItems;
    return baseItems.filter((i) => i.trainer.toLowerCase().includes(q));
  }, [baseItems, trainerFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => { setPage(1); }, [trainerFilter]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  const pageNums = useMemo(() => {
    const maxBtns = 7;
    const arr = [];
    let s = Math.max(1, page - 3);
    let e = Math.min(totalPages, s + maxBtns - 1);
    if (e - s + 1 < maxBtns) s = Math.max(1, e - maxBtns + 1);
    for (let i = s; i <= e; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  return (
    <div className="clients-coaches">
      <label className="clients-coaches__title">Поиск</label>
      <div className="clients-coaches__filters">
        <input
          className="clients-coaches__search"
          type="text"
          placeholder="Введите имя тренера"
          value={trainerFilter}
          onChange={(e) => setTrainerFilter(e.target.value)}
          autoComplete="off"
        />
      </div>

      {loading ? (
        <div className="clients-coaches__spinner" aria-label="Загрузка..." />
      ) : error ? (
        <p className="clients-coaches__error" role="alert">{error}</p>
      ) : (
        <>
          <div className="clients-coaches__tableWrap">
            <table className="clients-coaches__table">
              <thead>
                <tr>
                  <th>Тренер</th>
                  <th>Виды спорта</th>
                  <th>Кол-во видов спорта</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(({ trainer, sports, count }) => (
                  <tr key={trainer}>
                    <td>{trainer}</td>
                    <td>{sports.join(", ")}</td>
                    <td className="clients-coaches__count">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredItems.length > PAGE_SIZE && (
            <div className="clients-coaches__pagination" role="navigation" aria-label="Пагинация">
              <button className="clients-coaches__page-btn" onClick={() => setPage(1)} disabled={page === 1} aria-label="Первая">«</button>
              <button className="clients-coaches__page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Назад">‹</button>
              {pageNums.map((n) => (
                <button key={n} className={`clients-coaches__page-btn ${n === page ? "is-active" : ""}`} onClick={() => setPage(n)} aria-current={n === page ? "page" : undefined}>{n}</button>
              ))}
              <button className="clients-coaches__page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Вперёд">›</button>
              <button className="clients-coaches__page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Последняя">»</button>
              <span className="clients-coaches__page-info">{page} / {totalPages} • всего {filteredItems.length}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientsCoaches;
