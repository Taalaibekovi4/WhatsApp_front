import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useProductsStore } from "../../../store/products";
import "./AnalyticsProducts.scss";

const PAGE_SIZE = 10;

const AnalyticsProducts = () => {
  const { items, loading, error, load } = useProductsStore();

  const [query, setQuery] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!items.length) load();
  }, [items.length, load]);

// только проданные позиции (НОВЫЕ СВЕРХУ)
const soldProducts = useMemo(() => {
  const products = Array.isArray(items) ? items : [];

  const toTS = (s) => {
    if (!s) return 0;
    const t = new Date(s).getTime();
    if (!Number.isNaN(t)) return t;
    // На случай форматов типа "DD.MM.YYYY"
    const parts = String(s).split(/[.\-/]/).map(Number);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      // если похоже на YYYY-MM-DD
      if (a > 31) return new Date(a, (b || 1) - 1, c || 1).getTime() || 0;
      // иначе считаем DD.MM.YYYY
      return new Date(c || 1970, (b || 1) - 1, a || 1).getTime() || 0;
    }
    return 0;
  };

  return products
    .filter((p) => Number(p.count) > 0 && p.price_selling && p.date_selling)
    .map((p) => ({
      id: p.id,
      name: p.name || "Без названия",
      count: Number(p.count) || 0,
      price: Number(p.price_selling) || 0,
      revenue: ((Number(p.price_selling) || 0) * (Number(p.count) || 0)).toFixed(2),
      date: p.date_selling || "-",
      _ts: toTS(p.date_selling), // timestamp для сортировки
    }))
    // Сортируем: сначала по дате (новее выше), при равенстве — по id по убыванию
    .sort((a, b) => (b._ts - a._ts) || (Number(b.id) - Number(a.id)));
}, [items]);

  const totalSold = useMemo(
    () => soldProducts.reduce((sum, p) => sum + (Number(p.count) || 0), 0),
    [soldProducts]
  );

  const totalRevenue = useMemo(
    () =>
      soldProducts
        .reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.count) || 0), 0)
        .toFixed(2),
    [soldProducts]
  );

  const topProducts = useMemo(
    () =>
      [...soldProducts]
        .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))
        .slice(0, 3)
        .map((p) => ({
          id: p.id,
          name: p.name,
          count: p.count,
          revenue: (Number(p.price) * Number(p.count)).toFixed(2),
        })),
    [soldProducts]
  );

  const monthlySales = useMemo(() => {
    const map = soldProducts.reduce((acc, p) => {
      const d = new Date(p.date);
      if (Number.isNaN(d.getTime())) return acc;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      acc[key] = (acc[key] || 0) + (Number(p.count) || 0);
      return acc;
    }, {});
    return Object.entries(map)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [soldProducts]);

  // фильтр (поиск)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return soldProducts;
    return soldProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [soldProducts, query]);

  // подсказки для комбобокса
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const uniq = Array.from(new Set(soldProducts.map((p) => p.name)));
    return uniq.filter((n) => n.toLowerCase().includes(q)).slice(0, 12);
  }, [soldProducts, query]);

  // сброс страницы при изменении запроса
  useEffect(() => { setPage(1); }, [query]);

  // пагинация
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pagesToShow = useMemo(() => {
    const maxButtons = 7;
    const nums = [];
    let start = Math.max(1, page - 3);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [page, totalPages]);

  // combobox handlers
  const onComboKeyDown = (e) => {
    if (!comboOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setComboOpen(true);
      return;
    }
    if (!comboOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        setQuery(suggestions[activeIdx]);
        setComboOpen(false);
      }
    } else if (e.key === "Escape") {
      setComboOpen(false);
    }
  };

  const retry = useCallback(() => load(), [load]);

  return (
    <section className="analytics-products" aria-labelledby="analytics-products-title">
      <header className="analytics-products__header">
        <h2 id="analytics-products-title" className="analytics-products__title">
          Аналитика продуктов
        </h2>

        {/* Combobox с typeahead-поиском */}
        <div className="analytics-products__combo" role="combobox" aria-expanded={comboOpen}>
          <input
            className="analytics-products__combo-input"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setComboOpen(true); setActiveIdx(-1); }}
            onFocus={() => setComboOpen(true)}
            onBlur={() => setTimeout(() => setComboOpen(false), 120)}
            onKeyDown={onComboKeyDown}
            placeholder="Поиск по названию"
            aria-label="Поиск по названию товара"
            autoComplete="off"
          />
          {comboOpen && suggestions.length > 0 && (
            <ul className="analytics-products__combo-list" role="listbox">
              {suggestions.map((s, idx) => (
                <li
                  key={`${s}-${idx}`}
                  role="option"
                  aria-selected={idx === activeIdx}
                  className={`analytics-products__combo-item ${idx === activeIdx ? "is-active" : ""}`}
                  onMouseDown={() => { setQuery(s); setComboOpen(false); }}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {loading ? (
        <div className="analytics-products__loading" role="status" aria-live="polite">
          <span className="analytics-products__spinner" />
          Загрузка…
        </div>
      ) : error ? (
        <div className="analytics-products__error" role="alert">
          {error}
        </div>
      ) : (
        <div className="analytics-products__grid">
          {/* Итоги */}
          <article className="analytics-products__card">
            <header className="analytics-products__card-head">
              <h3 className="analytics-products__card-title">Итоги</h3>
            </header>
            <div className="analytics-products__summary">
              <div className="analytics-products__stat">
                <span className="analytics-products__stat-name">Продано единиц</span>
                <span className="analytics-products__stat-val">{totalSold}</span>
              </div>
              <div className="analytics-products__stat">
                <span className="analytics-products__stat-name">Выручка</span>
                <span className="analytics-products__stat-val">{totalRevenue} ₽</span>
              </div>
            </div>
          </article>

          {/* Топ-3 */}
          <article className="analytics-products__card">
            <header className="analytics-products__card-head">
              <h3 className="analytics-products__card-title">Топ-3 по продажам</h3>
            </header>
            <div className="analytics-products__table-wrap analytics-products__table-wrap--scroll">
              {topProducts.length ? (
                <table className="analytics-products__table" aria-label="Топ-3 продуктов">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Кол-во</th>
                      <th>Выручка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.count}</td>
                        <td>{p.revenue} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="analytics-products__muted">Нет данных о продажах</p>
              )}
            </div>
          </article>

          {/* Продажи по месяцам */}
          <article className="analytics-products__card">
            <header className="analytics-products__card-head">
              <h3 className="analytics-products__card-title">Продажи по месяцам</h3>
            </header>
            <div className="analytics-products__table-wrap analytics-products__table-wrap--scroll">
              {monthlySales.length ? (
                <table className="analytics-products__table" aria-label="Продажи по месяцам">
                  <thead>
                    <tr>
                      <th>Месяц</th>
                      <th>Кол-во</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySales.map((m) => (
                      <tr key={m.month}>
                        <td>{m.month}</td>
                        <td>{m.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="analytics-products__muted">Нет данных о продажах</p>
              )}
            </div>
          </article>

          {/* Все продажи */}
          <article className="analytics-products__card analytics-products__card--full">
            <header className="analytics-products__card-head">
              <h3 className="analytics-products__card-title">Все продажи</h3>
              <span className="analytics-products__total">{filtered.length} записей</span>
            </header>

            <div className="analytics-products__table-wrap">
              <table className="analytics-products__table" aria-label="Все проданные товары">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Кол-во</th>
                    <th>Цена</th>
                    <th>Выручка</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="analytics-products__muted" style={{ textAlign: "center" }}>
                        Ничего не найдено
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.count}</td>
                        <td>{p.price}</td>
                        <td>{p.revenue}</td>
                        <td>{p.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* пагинация */}
            {totalPages > 1 && (
              <nav className="analytics-products__pagination" aria-label="Пагинация">
                <button
                  className="analytics-products__page-btn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  aria-label="Первая страница"
                >
                  «
                </button>
                <button
                  className="analytics-products__page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Предыдущая"
                >
                  ‹
                </button>
                {pagesToShow.map((n) => (
                  <button
                    key={n}
                    className={`analytics-products__page-btn ${n === page ? "is-active" : ""}`}
                    onClick={() => setPage(n)}
                    aria-current={n === page ? "page" : undefined}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="analytics-products__page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Следующая"
                >
                  ›
                </button>
                <button
                  className="analytics-products__page-btn"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  aria-label="Последняя страница"
                >
                  »
                </button>
                <span className="analytics-products__page-info">
                  {page} / {totalPages}
                </span>
              </nav>
            )}
          </article>
        </div>
      )}

      {!loading && error && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button className="analytics-products__page-btn" onClick={retry}>Повторить</button>
        </div>
      )}
    </section>
  );
};

export default AnalyticsProducts;
