import { apiFetch } from "@/lib/api";

export async function authFetch(path: string, options: RequestInit = {}) {
  let token = localStorage.getItem("access_token");

  let res = await apiFetch(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    const refreshRes = await apiFetch("/auth/refresh", { method: "POST" });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      localStorage.setItem("access_token", data.access_token);
      token = data.access_token;

      res = await apiFetch(path, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    } else {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
  }

  return res;
}
