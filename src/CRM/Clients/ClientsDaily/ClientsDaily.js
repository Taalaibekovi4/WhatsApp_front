import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiPlus, FiLoader } from "react-icons/fi";
import "./ClientsDaily.scss";

import { errorMessages } from "../../Constants/constants";
import { useClientsStore } from "../../../store/clients";

const PAGE_SIZE = 12;

/* маленький хук-дебаунс для ускорения фильтрации */
const useDebounced = (value, delay = 150) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};

const ClientsDaily = () => {
  const { items: clients = [], load, updateOne, error: storeError } = useClientsStore();

  const [query, setQuery] = useState("");
  const dQuery = useDebounced(query, 160); // фильтрация только после паузы
  const [rowAmounts, setRowAmounts] = useState({});
  const [processingId, setProcessingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: "", text: "" });

  const [page, setPage] = useState(1);
  const mountedRef = useRef(true);

  // быстрый безопасный загрузчик
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        setLoading(true);
        await load?.();
        if (!mountedRef.current) return;
        setBanner({ type: "", text: "" });
      } catch {
        if (!mountedRef.current) return;
        setBanner({ type: "error", text: errorMessages?.loadingError || "Ошибка загрузки данных." });
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
    return () => { mountedRef.current = false; };
  }, [load]);

  // показать ошибку стора, если пришла
  useEffect(() => {
    if (storeError) setBanner({ type: "error", text: storeError });
  }, [storeError]);

  /* пред-нормализуем данные для быстрой фильтрации */
  const prepared = useMemo(() => {
    return (clients || []).map((c) => ({
      ...c,
      _nameLC: String(c.name || "").toLowerCase(),
    }));
  }, [clients]);

  // фильтрация по имени (подстрока), по дебаунс-строке
  const filtered = useMemo(() => {
    const q = dQuery.trim().toLowerCase();
    if (!q) return [];
    return prepared.filter((c) => c._nameLC.includes(q));
  }, [prepared, dQuery]);

  // пагинация таблицы
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => setPage(1), [dQuery]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const paginationNumbers = useMemo(() => {
    const maxButtons = 7;
    const nums = [];
    let start = Math.max(1, page - 3);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [page, totalPages]);

  const validateAmount = (val) => {
    if (!val || isNaN(val)) return errorMessages?.invalidAmount || "Некорректная сумма.";
    const n = Number(val);
    if (n <= 0) return errorMessages?.invalidAmount || "Сумма должна быть больше 0.";
    return "";
  };

  const extendPayment = async (client) => {
    const val = rowAmounts[client.id];
    const msg = validateAmount(val);
    if (msg) { setBanner({ type: "error", text: msg }); return; }

    try {
      setProcessingId(client.id);
      const newPrice = (Number(client.price || 0) + Number(val)).toFixed(2);
      await updateOne?.(client.id, { price: newPrice });
      setBanner({ type: "success", text: `Оплата клиента «${client.name}» увеличена на ${Number(val)} сом.` });
      setRowAmounts((s) => ({ ...s, [client.id]: "" }));
    } catch (err) {
      console.error(err);
      setBanner({ type: "error", text: errorMessages?.renewalError || "Ошибка продления оплаты." });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="clients-daily">
      <label className="clients-daily__title">Поиск</label>
      <div className="clients-daily__filters">
        <input
          className="clients-daily__search"
          type="text"
          placeholder="Введите имя или телефон"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {banner.text && (
        <div
          className={`clients-daily__banner ${banner.type === "error" ? "clients-daily__banner--error" : "clients-daily__banner--success"}`}
          role={banner.type === "error" ? "alert" : "status"}
        >
          {banner.text}
        </div>
      )}

      {loading ? (
        <div className="clients-daily__spinner" aria-label="Загрузка..."><FiLoader className="spin" /></div>
      ) : !dQuery ? (
        <p className="clients-daily__hint">Начните вводить имя клиента сверху.</p>
      ) : filtered.length === 0 ? (
        <p className="clients-daily__empty">{errorMessages?.clientNotFound || "Клиенты не найдены."}</p>
      ) : (
        <>
          <div className="clients-daily__tableWrap">
            <div className="clients-daily__tableContainer">
              <table className="clients-daily__table">
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Месяц</th>
                    <th>Дата</th>
                    <th>Оплата</th>
                    <th className="clients-daily__thAction">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => (
                    <tr key={c.id} className={c.payment === "Неоплачено" ? "clients-daily__rowUnpaid" : ""}>
                      <td className="clients-daily__colName">{c.name || "-"}</td>
                      <td className="clients-daily__colMonth">{c.month || "-"}</td>
                      <td className="clients-daily__colDate">{c.day || "-"} {c.year || "-"}</td>
                      <td className="clients-daily__colPay">
                        <span className="clients-daily__price">{Number(c.price || 0)} сом</span>
                      </td>
                      <td className="clients-daily__colAction">
                        <input
                          type="number"
                          className="clients-daily__inlineAmount"
                          placeholder="Добавить сум"
                          aria-label={`Сумма для ${c.name}`}
                          value={rowAmounts[c.id] ?? ""}
                          onChange={(e) => setRowAmounts((s) => ({ ...s, [c.id]: e.target.value }))}
                          min="0.01"
                          step="0.01"
                        />
                        <button
                          type="button"
                          className="clients-daily__btn"
                          onClick={() => extendPayment(c)}
                          disabled={!rowAmounts[c.id] || Number(rowAmounts[c.id]) <= 0 || processingId === c.id}
                          aria-label={`Добавить оплату для ${c.name}`}
                          title="Добавить оплату"
                        >
                          {processingId === c.id ? <span className="clients-daily__btnWait">...</span> : <> <FiPlus /> <span>Добавить</span> </>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="clients-daily__pagination" role="navigation" aria-label="Пагинация">
              <button className="clients-daily__pageBtn" onClick={() => setPage(1)} disabled={page === 1} aria-label="Первая страница">«</button>
              <button className="clients-daily__pageBtn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Предыдущая">‹</button>
              {paginationNumbers.map((n) => (
                <button key={n} className={`clients-daily__pageBtn ${n === page ? "is-active" : ""}`} onClick={() => setPage(n)} aria-current={n === page ? "page" : undefined}>{n}</button>
              ))}
              <button className="clients-daily__pageBtn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Следующая">›</button>
              <button className="clients-daily__pageBtn" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Последняя страница">»</button>
              <span className="clients-daily__pageInfo">{page} / {totalPages} • всего {filtered.length}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientsDaily;
