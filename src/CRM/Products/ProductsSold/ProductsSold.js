import React, { useEffect, useMemo } from "react";
import { useProductsStore } from "../../../../store/products";
import "./ProductsSold.scss";

const formatMoney = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString("ru-RU") + " KGS";
};

const ProductsSold = () => {
  const { items, load, loading, error } = useProductsStore();

  useEffect(() => {
    load?.();
  }, [load]);

  // только проданные, сортируем по дате продажи (новые сверху)
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
    <section className="products-sold">
      <div className="products-sold__card">
        <h2 className="products-sold__heading">Проданные продукты</h2>

        <div className="products-sold__stats">
          <span>Всего продаж: {totals.totalSales}</span>
          <button type="button" className="products-sold__link" tabIndex={-1}>
            Продано единиц: {totals.totalUnits}
          </button>
          <span className="products-sold__revenue">
            Общая выручка: {formatMoney(totals.totalRevenue)}
          </span>
        </div>

        <div className="products-sold__table-wrap" role="region" aria-label="Проданные продукты">
          {loading ? (
            <div className="products-sold__loader" aria-label="Загрузка..." />
          ) : error ? (
            <p className="products-sold__error" role="alert">
              {error}
            </p>
          ) : sold.length === 0 ? (
            <p className="products-sold__empty">Проданных продуктов пока нет.</p>
          ) : (
            <table className="products-sold__table">
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
                    <td>{p.name || "-"}</td>
                    <td className="products-sold__price">
                      {formatMoney(p.price_selling || p.product_price || 0)}
                    </td>
                    <td>
                      <span className="products-sold__qty-pill">
                        {Number(p.count || 0)} шт
                      </span>
                    </td>
                    <td>{p.date_selling || "-"}</td>
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

export default ProductsSold;
