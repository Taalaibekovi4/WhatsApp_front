// src/api/http.js
import axios from "axios";
import { config } from "../../../config/env";

const http = axios.create({
  baseURL: config.API_URL,
//   withCredentials: true,
});

export default http;
