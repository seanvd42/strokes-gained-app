export interface SimpleFinAccount {
  org: { name: string; domain?: string };
  id: string;
  name: string;
  currency: string;
  balance: string;
  "available-balance"?: string;
  "balance-date": number;
  transactions: SimpleFinTransaction[];
}

export interface SimpleFinTransaction {
  id: string;
  posted: number;
  amount: string;
  description: string;
  pending?: boolean;
  memo?: string;
}

export interface SimpleFinResponse {
  errors: string[];
  accounts: SimpleFinAccount[];
}

export async function claimAccessUrl(claimUrl: string): Promise<string> {
  const res = await fetch(claimUrl, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to claim access URL: ${res.statusText}`);
  return res.text();
}

export async function fetchAccounts(
  accessUrl: string,
  startDate?: Date,
  endDate?: Date
): Promise<SimpleFinResponse> {
  const url = new URL(`${accessUrl}/accounts`);
  if (startDate) url.searchParams.set("start-date", Math.floor(startDate.getTime() / 1000).toString());
  if (endDate) url.searchParams.set("end-date", Math.floor(endDate.getTime() / 1000).toString());

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(`SimpleFin request failed: ${res.status} ${res.statusText}`);

  return res.json();
}

export function parseSimpleFinDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
