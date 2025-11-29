import http from "./http";

export const RequestsApi = {
  list() {
    return http.get("/api/clients/");
  },
  create(payload) {
    return http.post("/api/clients/", payload);
  },
  accept(id) {
    return http.patch(`/api/clients/${id}/`, { status: "accepted" });
  },
};
