const CLICKUP_API_URL = "https://api.clickup.com/api/v2";
const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN ?? "";

export type ClickUpTask = {
  id: string;
  name: string;
  status: { status: string };
  due_date: string | null;
  url: string;
  assignees: { id: number; username: string }[];
  list: { id: string; name: string };
};

export async function clickupFetch<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
  const url = new URL(`${CLICKUP_API_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(`${key}[]`, v);
    } else {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: CLICKUP_TOKEN },
  });

  if (!res.ok) {
    throw new Error(`ClickUp API ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}
