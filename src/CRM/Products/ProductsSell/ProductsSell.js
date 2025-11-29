import React, { useEffect, useMemo, useState } from "react";
import { FaTimes, FaShoppingCart, FaCalendarAlt, FaHashtag } from "react-icons/fa";
import "./ProductsSell.scss";
import { sellProduct as apiSellProduct } from "../../../../Api/products";
import { useProductsStore } from "../../../../store/products";

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const ProductsSell = ({ product, onClose, onSold }) => {
  const { update } = useProductsStore();
  const [date, setDate] = useState(todayISO());
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setMsg("");
    setDate(todayISO());
    setQty("1");
  }, [product]);

  const maxQty = Number(product?.product_quantity ?? 0);
  const price = Number(product?.product_price ?? 0);

  const totals = useMemo(() => {
    const q = Number(qty) || 0;
    const sum = q * price;
    const left = maxQty - q;
    return {
      quantity: q,
      sum,
      left: left < 0 ? 0 : left,
    };
  }, [qty, price, maxQty]);

  const handleSell = async (e) => {
    e.preventDefault();
    setMsg("");
    const q = Number(qty);
    if (!product) return;
    if (!date) {
      setMsg("Укажите дату продажи.");
      return;
    }
    if (!q || q <= 0) {
      setMsg("Количество должно быть больше 0.");
      return;
    }
    if (q > maxQty) {
      setMsg("Недостаточно товара на складе.");
      return;
    }

    setLoading(true);
    try {
      const updated = await apiSellProduct(product.id, price, date, q);
      // обновляем стор
      update?.(updated);
      onSold?.(updated);
      onClose?.();
    } catch (err) {
      setMsg("Ошибка при продаже товара.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="products-sell" role="dialog" aria-modal="true">
      <div className="products-sell__box">
        <button
          type="button"
          className="products-sell__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <FaTimes />
        </button>

        <h3 className="products-sell__title">Продажа товара</h3>

        <form className="products-sell__form" onSubmit={handleSell}>
          {/* товар */}
          <label className="products-sell__field">
            <span className="products-sell__label">Товар</span>
            <input
              type="text"
              className="products-sell__input products-sell__input--readonly"
              value={product?.name || ""}
              readOnly
            />
          </label>

          {/* дата */}
          <label className="products-sell__field">
            <span className="products-sell__label">
              <FaCalendarAlt /> Дата продажи
            </span>
            <input
              type="date"
              className="products-sell__input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
            />
          </label>

          {/* количество */}
          <label className="products-sell__field">
            <span className="products-sell__label">
              <FaHashtag /> Количество
            </span>
            <input
              type="number"
              min="1"
              max={maxQty}
              className="products-sell__input"
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
            />
          </label>

          {/* блок с расчётом */}
          <div className="products-sell__summary">
            <div className="products-sell__summary-row">
              <div>
                <span className="products-sell__summary-caption">Цена за ед.:</span>
                <p className="products-sell__summary-value">
                  {price ? price.toLocaleString("ru-RU") + " KGS" : "—"}
                </p>
              </div>
              <div>
                <span className="products-sell__summary-caption">Количество:</span>
                <p className="products-sell__summary-value">
                  {totals.quantity ? `${totals.quantity} шт` : "—"}
                </p>
              </div>
            </div>

            <div className="products-sell__summary-total">
              <span>Итоговая сумма:</span>
              <p>{totals.sum ? totals.sum.toLocaleString("ru-RU") + " KGS" : "—"}</p>
            </div>

            <div className="products-sell__summary-left">
              <span>Остаток после продажи:</span>
              <p>{totals.left} шт</p>
            </div>
          </div>

          {msg && (
            <div className="products-sell__alert" role="alert">
              {msg}
            </div>
          )}

          <div className="products-sell__actions">
            <button
              type="submit"
              className="products-sell__btn products-sell__btn--primary"
              disabled={loading}
            >
              {loading ? (
                <span className="products-sell__spinner" aria-label="Сохранение" />
              ) : (
                <>
                  <FaShoppingCart /> Продать
                </>
              )}
            </button>
            <button
              type="button"
              className="products-sell__btn products-sell__btn--ghost"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductsSell;
