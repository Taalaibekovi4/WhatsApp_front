import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaPen, FaTrash, FaShoppingCart, FaFilter } from "react-icons/fa";
import "./GoodsList.scss";
import { useProductsStore } from "../../store/products";
import GoodsSell from "./GoodsSell";

const formatMoney = (v) => (Number(v) || 0).toLocaleString("ru-RU") + " KGS";
const LOW_STOCK = 10;

const GoodsList = () => {
  const { items, load, create, update, remove, loading } = useProductsStore();

  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);

  const [edit, setEdit] = useState({
    open: false,
    mode: "create",
    product: { id: null, name: "", product_price: "", product_date: "", product_quantity: "" },
  });

  const [sell, setSell] = useState({ open: false, product: null });

  useEffect(() => { load(true); }, [load]);

  const stats = useMemo(() => {
    const total = items.length;
    const qty = items.reduce((a, p) => a + (Number(p.product_quantity) || 0), 0);
    const cost = items.reduce((a, p) => a + (Number(p.product_price) || 0) * (Number(p.product_quantity) || 0), 0);
    return { total, qty, cost };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = items;
    if (q) {
      base = base.filter((p) => {
        const name = String(p.name || "").toLowerCase();
        const date = String(p.product_date || "").toLowerCase();
        return name.includes(q) || date.includes(q);
      });
    }
    if (onlyLow) base = base.filter((p) => Number(p.product_quantity) < LOW_STOCK);
    return base;
  }, [items, search, onlyLow]);

  const openCreate = () => setEdit({ open: true, mode: "create", product: { id: null, name: "", product_price: "", product_date: "", product_quantity: "" }});
  const openEdit = (p) => setEdit({ open: true, mode: "edit", product: {
    id: p.id, name: p.name || "", product_price: String(p.product_price ?? ""), product_date: p.product_date || "", product_quantity: String(p.product_quantity ?? "")
  }});
  const closeEdit = () => setEdit((s) => ({ ...s, open: false }));

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEdit((prev) => ({
      ...prev,
      product: { ...prev.product, [name]: (name === "product_price" || name === "product_quantity") ? value.replace(/[^\d.]/g, "") : value },
    }));
  };

  const onEditSubmit = async (e) => {
    e.preventDefault();
    const p = edit.product;
    if (!p.name.trim() || !p.product_price || !p.product_date || !p.product_quantity) return;

    const payload = {
      name: p.name.trim(),
      product_price: Number(p.product_price),
      product_date: p.product_date,
      product_quantity: Number(p.product_quantity),
      status: false,
    };

    const res = edit.mode === "create" ? await create(payload) : await update(p.id, payload);
    if (res?.ok) closeEdit();
  };

  const onDelete = async (p) => { await remove(p.id); };
  const openSell = (p) => setSell({ open: true, product: p });
  const closeSell = () => setSell({ open: false, product: null });
  const soldDone = () => setSell({ open: false, product: null });

  return (
    <div className="goods-list">
      <h2 className="goods-list__pageTitle">Товары</h2>

      <div className="goods-list__card">
        <div className="goods-list__head">
          <div>
            <h3 className="goods-list__title">Список товаров</h3>
            <div className="goods-list__stats">
              <span>Позиций: {stats.total}</span>
              <span className="goods-list__stat">Всего шт: {stats.qty}</span>
              <span className="goods-list__stat goods-list__stat--accent">На сумму: {formatMoney(stats.cost)}</span>
            </div>
          </div>
          <button type="button" className="goods-list__addBtn" onClick={openCreate}>
            <FaPlus /> Добавить товар
          </button>
        </div>

        <div className="goods-list__filter">
          <input
            type="text"
            className="goods-list__search"
            placeholder="Поиск по названию или дате..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className={`goods-list__lowBtn${onlyLow ? " goods-list__lowBtn--active" : ""}`}
            onClick={() => setOnlyLow((v) => !v)}
            aria-pressed={onlyLow}
          >
            <FaFilter /> Меньше 10
          </button>
        </div>

        <div className="goods-list__tableWrap">
          <table className="goods-list__table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Цена</th>
                <th>Дата</th>
                <th>Количество</th>
                <th className="goods-list__thActions">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><div className="goods-list__loader" aria-label="Загрузка..." /></td></tr>
              ) : filtered.length ? (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name || "-"}</td>
                    <td className="goods-list__price">{formatMoney(p.product_price)}</td>
                    <td>{p.product_date || "-"}</td>
                    <td>
                      <span className={`goods-list__qty${Number(p.product_quantity) < LOW_STOCK ? " goods-list__qty--low" : ""}`}>
                        {p.product_quantity ?? 0} шт
                      </span>
                    </td>
                    <td className="goods-list__actions">
                      <button type="button" className="goods-list__sellBtn" onClick={() => openSell(p)}>
                        <FaShoppingCart /> Продать
                      </button>
                      <button type="button" className="goods-list__iconBtn" onClick={() => openEdit(p)} aria-label="Изменить">
                        <FaPen />
                      </button>
                      <button type="button" className="goods-list__iconBtn" onClick={() => onDelete(p)} aria-label="Удалить">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="goods-list__empty">Нет товаров</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка добавления/редактирования */}
      {edit.open && (
        <div className="goods-list__modal" role="dialog" aria-modal="true">
          <div className="goods-list__modalBox">
            <h3 className="goods-list__modalTitle">{edit.mode === "create" ? "Новый товар" : "Редактирование товара"}</h3>
            <form className="goods-list__form" onSubmit={onEditSubmit}>
              <label className="goods-list__field">
                <span className="goods-list__label">Название</span>
                <input
                  name="name"
                  value={edit.product.name}
                  onChange={onEditChange}
                  className="goods-list__input"
                  placeholder="Введите название"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="goods-list__field">
                <span className="goods-list__label">Цена (KGS)</span>
                <input
                  name="product_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={edit.product.product_price}
                  onChange={onEditChange}
                  className="goods-list__input"
                  required
                />
              </label>

              <label className="goods-list__field">
                <span className="goods-list__label">Дата</span>
                <input
                  name="product_date"
                  type="date"
                  value={edit.product.product_date}
                  onChange={onEditChange}
                  className="goods-list__input"
                  required
                />
              </label>

              <label className="goods-list__field">
                <span className="goods-list__label">Количество</span>
                <input
                  name="product_quantity"
                  type="number"
                  min="1"
                  value={edit.product.product_quantity}
                  onChange={onEditChange}
                  className="goods-list__input"
                  required
                />
              </label>

              <div className="goods-list__modalActions">
                <button type="submit" className="goods-list__btn goods-list__btn--primary" disabled={loading}>
                  {edit.mode === "create" ? "Добавить" : "Сохранить"}
                </button>
                <button type="button" className="goods-list__btn goods-list__btn--ghost" onClick={closeEdit} disabled={loading}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка продажи */}
      {sell.open && sell.product && (
        <GoodsSell product={sell.product} onClose={closeSell} onSold={soldDone} />
      )}
    </div>
  );
};

export default GoodsList;
