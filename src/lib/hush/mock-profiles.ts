export type MockInvoice = {
  id: string;
  amount: number;
  memo: string;
  dueAt?: string;
};

export function getMockInvoice(id: string): MockInvoice {
  return {
    id,
    amount: 750.0,
    memo: "Frontend consulting · April sprint · 15h @ $50/h",
    dueAt: "Apr 30",
  };
}
