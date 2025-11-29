import React from "react";
import {
  trainers,
  sports,
  months,
  years,
  days,
  checkFieldOptions,
  timeSlots,
  saleOptions,
  paymentOptions,
} from "../../Constants/constants";
import "./ClientsList.scss";

const TYPE_CLIENTS = ["Пробный", "Индивидуальный", "Абонемент"]; // без "Обычный"

const SelectField = ({ name, value, onChange, options, placeholder }) => (
  <select
    name={name}
    value={value || ""}
    onChange={onChange}
    className="clients-list__modal-select"
    aria-label={placeholder}
  >
    <option value="" disabled>
      {placeholder}
    </option>
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

const InputField = ({ name, value, onChange, type = "text", placeholder }) => (
  <input
    type={type}
    name={name}
    value={value || ""}
    onChange={onChange}
    placeholder={placeholder}
    className="clients-list__modal-input"
    autoComplete="off"
  />
);

const DateFields = ({ formData, onChange }) => (
  <div className="clients-list__modal-date-group">
    <SelectField
      name="day"
      value={formData.day}
      onChange={onChange}
      options={days}
      placeholder="День"
    />
    <SelectField
      name="month"
      value={formData.month}
      onChange={onChange}
      options={months}
      placeholder="Месяц"
    />
    <SelectField
      name="year"
      value={formData.year}
      onChange={onChange}
      options={years}
      placeholder="Год"
    />
    <InputField
      name="dataCassa"
      value={formData.dataCassa}
      onChange={onChange}
      type="date"
      placeholder="Дата кассы"
    />
  </div>
);

const ClientEditForm = ({
  formData,
  formErrors,
  onChange,
  onSave,
  onCancel,
  isProcessing,
}) => {
  const allowedPayments = paymentOptions.map((o) => o.value);

  return (
    <div className="clients-list__modal-form">
      {formErrors.length > 0 && (
        <div
          className="clients-list__error"
          role="alert"
          style={{ textAlign: "left" }}
        >
          {formErrors.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      )}

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Имя:</span>
        <InputField
          name="name"
          value={formData.name}
          onChange={onChange}
          placeholder="Имя"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Телефон:</span>
        <InputField
          name="phone"
          value={formData.phone}
          onChange={onChange}
          type="tel"
          placeholder="Телефон"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Спорт:</span>
        <SelectField
          name="sport_category"
          value={formData.sport_category}
          onChange={onChange}
          options={sports}
          placeholder="Спорт"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Тренер:</span>
        <SelectField
          name="trainer"
          value={formData.trainer}
          onChange={onChange}
          options={trainers}
          placeholder="Тренер"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Время:</span>
        <SelectField
          name="email"
          value={formData.email}
          onChange={onChange}
          options={timeSlots}
          placeholder="Время"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Источник:</span>
        <SelectField
          name="check_field"
          value={formData.check_field}
          onChange={onChange}
          options={checkFieldOptions}
          placeholder="Источник"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Пол:</span>
        <SelectField
          name="stage"
          value={formData.stage}
          onChange={onChange}
          options={["Мужской", "Женский"]}
          placeholder="Пол"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Дата:</span>
        <DateFields formData={formData} onChange={onChange} />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Тип клиента:</span>
        <SelectField
          name="typeClient"
          value={formData.typeClient}
          onChange={onChange}
          options={TYPE_CLIENTS}
          placeholder="Тип клиента"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Цена:</span>
        <InputField
          name="price"
          value={formData.price}
          onChange={onChange}
          type="number"
          placeholder="Цена"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Скидка:</span>
        <SelectField
          name="sale"
          value={formData.sale}
          onChange={onChange}
          options={saleOptions}
          placeholder="Скидка"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Оплата:</span>
        <SelectField
          name="payment"
          value={formData.payment}
          onChange={onChange}
          options={allowedPayments}
          placeholder="Оплата"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Комментарий:</span>
        <textarea
          name="commentBody"
          value={formData.commentBody || ""}
          onChange={onChange}
          placeholder="Комментарий"
          className="clients-list__modal-textarea"
          aria-label="Комментарий"
        />
      </div>

      <div className="clients-list__modal-row">
        <span className="clients-list__modal-label">Добавил:</span>
        <input
          className="clients-list__modal-input"
          value={formData.addedBy || "—"}
          readOnly
          disabled
        />
      </div>

      <div className="clients-list__modal-actions">
        <button
          className="clients-list__modal-button clients-list__modal-button--save"
          onClick={onSave}
          disabled={isProcessing}
        >
          Сохранить
        </button>
        <button
          className="clients-list__modal-button clients-list__modal-button--cancel"
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </div>
  );
};

export default ClientEditForm;
