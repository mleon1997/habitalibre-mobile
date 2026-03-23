import { API_BASE } from "./api";
import { setCustomerSession } from "./customerSession";

async function jsonFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.error ||
      data?.message ||
      "Ocurrió un error. Intenta de nuevo.";
    const err = new Error(message);
    err.data = data;
    throw err;
  }

  return data;
}

export async function customerLogin({ email, password }) {
  const data = await jsonFetch("/api/customer-auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const token = data?.token || data?.accessToken || data?.jwt || "";
  const customer = data?.customer || data?.user || { email };

  if (!token) throw new Error("Login OK pero no recibí token");

  setCustomerSession({ token, customer });
  return { token, customer };
}

export async function customerRegister({ email, password, nombre }) {
  const data = await jsonFetch("/api/customer-auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, nombre }),
  });

  const token = data?.token || data?.accessToken || data?.jwt || "";
  const customer = data?.customer || data?.user || { email, nombre };

  if (!token) throw new Error("Registro OK pero no recibí token");

  setCustomerSession({ token, customer });
  return { token, customer };
}

export async function forgotPassword({ email }) {
  return jsonFetch("/api/customer-auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword({ token, newPassword }) {
  return jsonFetch("/api/customer-auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}