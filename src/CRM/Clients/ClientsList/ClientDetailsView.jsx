import React from "react";
import "./ClientsList.scss";

const ClientDetailsView = ({ client, activePeriods }) => {
  if (!client) return null;

  return (
    <div className="clients-list__modal-form">
      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Имя:</span>
        <span>{client.name || "-"}</span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Телефон:</span>
        <span>{client.phone || "-"}</span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Спорт:</span>
        <span>{client.sport_category || "-"}</span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Тренер:</span>
        <span>{client.trainer || "-"}</span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Время:</span>
        <span>{client.email || "-"}</span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Источник:</span>
        <span>{client.check_field || "-"}</span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Пол:</span>
        <span>{client.stage || "-"}</span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Дата:</span>
        <span>
          {client.day || "-"} {client.month || "-"} {client.year || "-"}
          {"  "}
          {client.dataCassa || "-"}
        </span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Тип клиента:</span>
        <span>{client.typeClient || "-"}</span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Цена:</span>
        <span>{client.price ? `${client.price} сом` : "-"}</span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Скидка:</span>
        <span>{client.sale || "-"}</span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Оплата:</span>
        <span className="clients-list__modal-payment">
          {client.payment || "-"}
        </span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Активные месяцы:</span>
        <span>
          {activePeriods?.count > 0 ? (
            <>
              {activePeriods.count} мес.{" "}
              <select
                className="clients-list__modal-select clients-list__modal-select--inline"
                defaultValue=""
              >
                <option value="" disabled>
                  Период
                </option>
                {activePeriods.periods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </>
          ) : (
            "—"
          )}
        </span>
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Комментарий:</span>
        <span>{client.comment || "-"}</span>
      </div>
    </div>
  );
};

export default ClientDetailsView;
