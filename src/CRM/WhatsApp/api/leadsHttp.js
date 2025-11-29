// src/api/leadsHttp.js
import axios from "axios";
import { config } from "../../../config/env";

const leadsHttp = axios.create({
  baseURL: config.LEADS_API_URL,
  // без withCredentials, здесь они не нужны
});

export default leadsHttp;
