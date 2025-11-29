// src/Funnel/LeadsBoard/LeadsBoard.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import {
  FiRefreshCw,
  FiUser,
  FiPhone,
  FiShare2,
  FiSearch,
  FiCalendar,
} from "react-icons/fi";
import "./LeadsBoard.scss";
import LeadModal from "./LeadModal/LeadModal";

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL || "https://rasu0101.pythonanywhere.com",
});

/** Нормализация ответа /api/stages/ */
const normalizeStages = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeStatus = (status) => {
  const s = (status || "").toString().trim().toLowerCase();
  if (s === "bought" || s === "thinking" || s === "declined") return s;
  return s;
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** маппинг lead -> форма модалки (camelCase) */
const mapLeadToForm = (lead) => ({
  id: lead.id,
  name: lead.name || "",
  phone: lead.phone || "",
  channel: lead.channel || "",
  createdAt: lead.created_at || "",
  isChild: lead.client_type || "adult",
  sport: lead.sport || "",
  trainer: lead.trainer || "",
  preTrialStatus: lead.pre_trial_status || "",
  trialStatus: lead.trial_status || "",
  result: lead.result || "",
  amount: lead.amount ?? "",
  comment: lead.comment || "",
});

/** обратно форма -> lead (snake_case как у бэка) */
const mapFormToLead = (form, prev) => ({
  ...prev,
  name: form.name,
  phone: form.phone,
  channel: form.channel,
  created_at: form.createdAt || prev.created_at,
  client_type: form.isChild || prev.client_type,
  sport: form.sport,
  trainer: form.trainer,
  pre_trial_status: form.preTrialStatus,
  trial_status: form.trialStatus,
  result: form.result,
  amount: form.amount,
  comment: form.comment,
});

const monthOptions = [
  { value: "all", label: "Все месяцы" },
  { value: "1", label: "Январь" },
  { value: "2", label: "Февраль" },
  { value: "3", label: "Март" },
  { value: "4", label: "Апрель" },
  { value: "5", label: "Май" },
  { value: "6", label: "Июнь" },
  { value: "7", label: "Июль" },
  { value: "8", label: "Август" },
  { value: "9", label: "Сентябрь" },
  { value: "10", label: "Октябрь" },
  { value: "11", label: "Ноябрь" },
  { value: "12", label: "Декабрь" },
];

const yearOptions = [
  { value: "all", label: "Все годы" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
];

const normalizeText = (v) => (v || "").toString().trim().toLowerCase();

const LeadsBoard = () => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  /** -------- КОНТЕКСТНОЕ МЕНЮ -------- */
  const [menu, setMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    stageId: null,
    lead: null,
  });

  const openMenu = (e, stageId, lead) => {
    e.preventDefault();
    setMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      stageId,
      lead,
    });
  };

  useEffect(() => {
    const hide = () => {
      setMenu((m) => ({ ...m, visible: false }));
    };
    window.addEventListener("click", hide);
    return () => window.removeEventListener("click", hide);
  }, []);

  /** -------- DRAG & DROP (как Trello) -------- */
  const [dragData, setDragData] = useState({ leadId: null, fromStageId: null });
  const [dragOverStageId, setDragOverStageId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e, stageId, leadId) => {
    setDragData({ leadId, fromStageId: stageId });
    setIsDragging(true);
    try {
      // чтобы Firefox не ругался
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(leadId));
    } catch (_) {}
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragData({ leadId: null, fromStageId: null });
    setDragOverStageId(null);
  };

  const handleDragOverColumn = (e, stageId) => {
    if (!dragData.leadId || dragData.fromStageId === stageId) return;
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = "move";
    } catch (_) {}
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeaveColumn = (e, stageId) => {
    e.preventDefault();
    if (dragOverStageId === stageId) {
      setDragOverStageId(null);
    }
  };

  /** -------- ЗАГРУЗКА ЭТАПОВ -------- */
  const loadStages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/api/stages/");
      setStages(normalizeStages(data));
    } catch (err) {
      console.error("Ошибка загрузки этапов:", err);
      setError("Не удалось загрузить этапы и лидов.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  /** Универсальное перемещение лида (и для контекстного меню, и для drag&drop) */
  const performMoveLead = useCallback(
    async (leadId, targetStageId) => {
      if (!leadId || !targetStageId) return;

      try {
        // ВАЖНО: /api/leads/ а не /leads/
        await API.patch(`/api/leads/${leadId}/`, {
          stage: targetStageId,
        });

        setStages((prev) => {
          const next = JSON.parse(JSON.stringify(prev));
          let movingLead = null;

          // убираем лида из всех этапов и запоминаем
          next.forEach((st) => {
            const leadsArr = Array.isArray(st.leads) ? st.leads : [];
            const idx = leadsArr.findIndex((l) => l.id === leadId);
            if (idx !== -1) {
              movingLead = { ...leadsArr[idx], stage: targetStageId };
              leadsArr.splice(idx, 1);
              st.leads = leadsArr;
            }
          });

          // добавляем в целевой этап
          if (movingLead) {
            const target = next.find((s) => s.id === targetStageId);
            if (target) {
              const leadsArr = Array.isArray(target.leads)
                ? target.leads
                : [];
              target.leads = [...leadsArr, movingLead];
            }
          }

          return next;
        });
      } catch (err) {
        console.error("Ошибка перемещения:", err);
      }
    },
    []
  );

  /** Drop на колонку */
  const handleDropColumn = async (e, stageId) => {
    e.preventDefault();
    setDragOverStageId(null);

    if (!dragData.leadId || dragData.fromStageId === stageId) return;

    await performMoveLead(dragData.leadId, stageId);

    setDragData({ leadId: null, fromStageId: null });
    setIsDragging(false);
  };

  /** Контекстное меню использует тот же performMoveLead */
  const moveLeadToStageFromMenu = async (targetStageId) => {
    if (!menu.lead) return;
    await performMoveLead(menu.lead.id, targetStageId);
    setMenu((m) => ({ ...m, visible: false }));
  };

  const handleOpenLead = (stageId, lead) => {
    if (!lead) return;
    // при drag&drop не открываем модалку случайным кликом
    if (isDragging) return;

    setSelectedStageId(stageId);
    setSelectedLead(mapLeadToForm(lead));
  };

  const handleCloseModal = () => {
    setSelectedLead(null);
    setSelectedStageId(null);
  };

  const handleSaveLead = (formData) => {
    if (!selectedStageId || !formData || !formData.id) {
      handleCloseModal();
      return;
    }

    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id !== selectedStageId) return stage;

        const leads = Array.isArray(stage.leads) ? stage.leads : [];
        const nextLeads = leads.map((lead) =>
          lead.id === formData.id ? mapFormToLead(formData, lead) : lead
        );

        return {
          ...stage,
          leads: nextLeads,
        };
      })
    );

    handleCloseModal();
  };

  const sortedStages = useMemo(() => {
    const arr = Array.isArray(stages) ? stages : [];
    return [...arr].sort((a, b) => {
      const ao = Number(a.order);
      const bo = Number(b.order);
      if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) {
        return ao - bo;
      }
      const aId = Number(a.id) || 0;
      const bId = Number(b.id) || 0;
      return aId - bId;
    });
  }, [stages]);

  const monthNumber = monthFilter === "all" ? null : Number(monthFilter);
  const yearNumber = yearFilter === "all" ? null : Number(yearFilter);
  const searchQuery = normalizeText(search);

  const filterByDateAndSearch = useCallback(
    (lead) => {
      const created = lead.created_at ? new Date(lead.created_at) : null;

      if (monthNumber || yearNumber) {
        if (!created || Number.isNaN(created.getTime())) {
          return false;
        }
        if (monthNumber && created.getMonth() + 1 !== monthNumber) {
          return false;
        }
        if (yearNumber && created.getFullYear() !== yearNumber) {
          return false;
        }
      }

      if (!searchQuery) return true;

      const nameText = normalizeText(lead.name);
      const phoneText = normalizeText(lead.phone);
      const channelText = normalizeText(lead.channel);

      return (
        nameText.includes(searchQuery) ||
        phoneText.includes(searchQuery) ||
        channelText.includes(searchQuery)
      );
    },
    [monthNumber, yearNumber, searchQuery]
  );

  return (
    <div className="leads-board">
      <div className="leads-board__header">
        <div className="leads-board__title-wrap">
          <h1 className="leads-board__title">Воронка лидов</h1>
          <p className="leads-board__subtitle">
            Следите за движением клиентов от первого контакта до покупки.
          </p>
        </div>

        <button
          type="button"
          className="leads-board__reload"
          onClick={loadStages}
          disabled={loading}
        >
          <FiRefreshCw className="leads-board__reload-icon" />
          <span>Обновить</span>
        </button>
      </div>

      {/* Фильтры по дате и поиск */}
      <div className="leads-board__filters">
        <div className="leads-board__filters-row">
          <div className="leads-board__filters-label">
            <FiCalendar className="leads-board__filters-icon" />
            <span>Фильтр по дате</span>
          </div>

          <div className="leads-board__filters-controls">
            <select
              className="leads-board__select"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              className="leads-board__select"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="leads-board__search">
          <div className="leads-board__search-icon-wrap">
            <FiSearch className="leads-board__search-icon" />
          </div>
          <input
            className="leads-board__search-input"
            placeholder="Поиск по имени, телефону или каналу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="leads-board__error">{error}</div>}

      <div className="leads-board__columns">
        {loading && sortedStages.length === 0 && (
          <div className="leads-board__empty-global">Загружаю этапы...</div>
        )}

        {!loading && sortedStages.length === 0 && (
          <div className="leads-board__empty-global">
            Этапы не найдены. Создайте 5 этапов на бэке (Первый контакт,
            Пробная тренировка, Ушли подумать, Купили, Отказ).
          </div>
        )}

        {sortedStages.map((stage) => {
          const rawLeads = Array.isArray(stage.leads) ? stage.leads : [];

          const activeLeads = rawLeads
            .filter((lead) => !lead.is_deleted)
            .filter(filterByDateAndSearch)
            .sort((a, b) => {
              const aTime = new Date(a.created_at || 0).getTime();
              const bTime = new Date(b.created_at || 0).getTime();
              return bTime - aTime;
            });

          return (
            <div className="leads-board__column" key={stage.id}>
              <div className="leads-board__column-header">
                <div className="leads-board__column-title-wrap">
                  <span className="leads-board__column-title">
                    {stage.title || "Этап"}
                  </span>
                  <span className="leads-board__column-count">
                    {activeLeads.length}
                  </span>
                </div>
                {stage.is_final && (
                  <span className="leads-board__column-label">ФИНАЛЬНЫЙ</span>
                )}
              </div>

              <div
                className={
                  "leads-board__column-body" +
                  (dragOverStageId === stage.id
                    ? " leads-board__column-body--drop-target"
                    : "")
                }
                onDragOver={(e) => handleDragOverColumn(e, stage.id)}
                onDrop={(e) => handleDropColumn(e, stage.id)}
                onDragLeave={(e) => handleDragLeaveColumn(e, stage.id)}
              >
                {activeLeads.length === 0 && (
                  <div className="leads-board__column-empty">
                    <span className="leads-board__column-empty-icon">×</span>
                    <span className="leads-board__column-empty-text">
                      Нет лидов на этом этапе
                    </span>
                  </div>
                )}

                {activeLeads.length > 0 && (
                  <div className="leads-board__cards">
                    {activeLeads.map((lead) => (
                      <button
                        type="button"
                        className="leads-board__card"
                        key={lead.id}
                        onClick={() => handleOpenLead(stage.id, lead)}
                        onContextMenu={(e) => openMenu(e, stage.id, lead)}
                        draggable
                        onDragStart={(e) =>
                          handleDragStart(e, stage.id, lead.id)
                        }
                        onDragEnd={handleDragEnd}
                      >
                        <div className="leads-board__card-top">
                          <div className="leads-board__card-line">
                            <FiUser className="leads-board__card-icon" />
                            <span className="leads-board__card-name">
                              {lead.name || "Без имени"}
                            </span>
                          </div>
                          <div className="leads-board__card-line">
                            <FiPhone className="leads-board__card-icon" />
                            <span className="leads-board__card-phone">
                              {lead.phone || "Без телефона"}
                            </span>
                          </div>
                        </div>

                        <div className="leads-board__card-bottom">
                          <span className="leads-board__card-channel">
                            {(lead.channel || "").toString().toUpperCase() ||
                              "КАНАЛ"}
                          </span>

                          {lead.created_at && (
                            <span className="leads-board__card-date">
                              {formatDate(lead.created_at)}
                            </span>
                          )}
                        </div>

                        {normalizeStatus(lead.result) && (
                          <div className="leads-board__card-tag-row">
                            <span className="leads-board__card-tag">
                              {normalizeStatus(lead.result) === "bought" &&
                                "Купили"}
                              {normalizeStatus(lead.result) === "thinking" &&
                                "Ушли думать"}
                              {normalizeStatus(lead.result) === "declined" &&
                                "Отказались"}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Контекстное меню для перемещения лида */}
      {menu.visible && (
        <div
          className="leads-board__context-menu"
          style={{ top: menu.y, left: menu.x }}
        >
          {sortedStages
            .filter((s) => s.id !== menu.stageId)
            .map((st) => (
              <button
                key={st.id}
                className="leads-board__context-item"
                onClick={() => moveLeadToStageFromMenu(st.id)}
              >
                {st.title}
              </button>
            ))}
        </div>
      )}

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={handleCloseModal}
          onSave={handleSaveLead}
        />
      )}
    </div>
  );
};

export default LeadsBoard;
