import React, { useEffect, useMemo } from "react";
import { useProductsStore } from "../../store/products";
import "./GoodsSold.scss";

const money = (v) => (Number(v) || 0).toLocaleString("ru-RU") + " KGS";

const GoodsSold = () => {
  const { items, load, loading, error } = useProductsStore();

  useEffect(() => {
    load?.(true);
  }, [load]);

  // только продажи; новые сверху
  const sold = useMemo(() => {
    const src = Array.isArray(items) ? items : [];
    return src
      .filter((p) => Number(p?.count || 0) > 0)
      .sort((a, b) => {
        const da = String(a?.date_selling || a?.product_date || "");
        const db = String(b?.date_selling || b?.product_date || "");
        const byDate = db.localeCompare(da);
        if (byDate !== 0) return byDate;
        return (b?.id ?? 0) - (a?.id ?? 0);
      });
  }, [items]);

  const totals = useMemo(() => {
    const totalSales = sold.length;
    const totalUnits = sold.reduce((acc, p) => acc + (Number(p.count) || 0), 0);
    const totalRevenue = sold.reduce((acc, p) => {
      const price = Number(p.price_selling || p.product_price || 0);
      const qty = Number(p.count || 0);
      return acc + price * qty;
    }, 0);
    return { totalSales, totalUnits, totalRevenue };
  }, [sold]);

  return (
    <section className="goods-sold">
      <div className="goods-sold__card">
        <h2 className="goods-sold__heading">Проданные товары</h2>

        <div className="goods-sold__stats">
          <span>Всего продаж: {totals.totalSales}</span>
          <span className="goods-sold__stat">Продано единиц: {totals.totalUnits}</span>
          <span className="goods-sold__revenue">Общая выручка: {money(totals.totalRevenue)}</span>
        </div>

        <div className="goods-sold__tableWrap" role="region" aria-label="Проданные товары">
          {loading ? (
            <div className="goods-sold__loader" aria-label="Загрузка…" />
          ) : error ? (
            <p className="goods-sold__error" role="alert">{error}</p>
          ) : sold.length === 0 ? (
            <p className="goods-sold__empty">Пока нет продаж.</p>
          ) : (
            <table className="goods-sold__table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Цена продажи</th>
                  <th>Продано</th>
                  <th>Дата продажи</th>
                </tr>
              </thead>
              <tbody>
                {sold.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name || "—"}</td>
                    <td className="goods-sold__price">{money(p.price_selling || p.product_price || 0)}</td>
                    <td>
                      <span className="goods-sold__qtyPill">{Number(p.count || 0)} шт</span>
                    </td>
                    <td>{p.date_selling || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};

export default GoodsSold;
