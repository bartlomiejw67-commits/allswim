import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Rejestruje endpointy logowania (Convex Auth).
auth.addHttpRoutes(http);

export default http;
