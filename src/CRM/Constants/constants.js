export const trainers = [
  "Асанбаев Эрлан",
  "Азизбек Уулу Баяман",
  "Жумалы Уулу Ариет",
  "Калмамат Уулу Акай",
  "Машрапов Жумабай",
  "Машрапов Тилек",
  "Медербек Уулу Сафармурат",
  "Минбаев Сулайман",
  "Мойдунов Мирлан",
  "Сыдыков Алайбек",
  "Пазылов Кутман",
  "Тажибаев Азамат",
  "Тургунов Ислам",
];

export const sports = [
  "Бокс",
  "Борьба",
  "Греко-римская борьба",
  "Дзюдо",
  "Кикбокс",
  "Кроссфит",
  "Кулату",
  "Самбо",
  "Тхэквондо",
];

export const months = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
export const typeClients = ['Обычный', 'Пробный', 'Индивидуальный', 'Абонемент'];
export const years = ["2025", "2026"];
export const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
export const checkFieldOptions = ["От знакомых", "Из соцсетей"];
export const timeSlots = [
  "09:00", "10:00", "10:30", "12:00", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "20:00"
];
export const saleOptions = ["15%", "20%", "Без скидки"];
export const renewalOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
export const CORRECT_PIN = "4444";

export const paymentOptions = [
  { value: "Оплачено", label: "Оплачено" },
  { value: "Не оплачено", label: "Не оплачено" }
];

export const errorMessages = {
  loadingError: "Ошибка загрузки данных.",
  clientNotFound: "Клиент не найден",
  invalidAmount: "Введите корректную сумму!",
  duplicateClient: "Клиент с таким именем, месяцем, годом и видом спорта уже существует!",
  addClientError: "Ошибка при добавлении клиента. Проверьте данные и попробуйте снова.",
  updateClientError: "Ошибка при обновлении данных.",
  deleteClientError: "Ошибка при удалении.",
  renewalError: "Ошибка при продлении оплаты.",
  invalidPin: "Неверный PIN-код.",
};

export const formFieldConfig = [
  { name: "name", type: "text", placeholder: "Имя", required: true },
  { name: "phone", type: "text", placeholder: "Телефон", required: true },
  { name: "sport_category", type: "select", placeholder: "Спорт", options: sports, required: true },
  { name: "trainer", type: "select", placeholder: "Тренер", options: trainers, required: true },
  { name: "email", type: "select", placeholder: "Время", options: timeSlots, required: true },
  { name: "check_field", type: "select", placeholder: "Источник", options: checkFieldOptions, required: true },
  { name: "stage", type: "select", placeholder: "Пол", options: ["Мужской", "Женский"], required: true },
  { name: "year", type: "text", placeholder: "Год", readOnly: true },
  { name: "month", type: "select", placeholder: "Месяц", options: months, required: true },
  { name: "day", type: "select", placeholder: "День", options: days, required: true },
  { name: "sale", type: "select", placeholder: "Скидка", options: saleOptions, required: true },
  { name: "price", type: "number", placeholder: "Цена", required: true },
  { name: "payment", type: "select", placeholder: "Оплата", options: paymentOptions.map(opt => opt.value), required: true },
  { name: "comment", type: "textarea", placeholder: "Комментарий" },
];