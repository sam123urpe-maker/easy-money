export type WorkerName =
  | "Douglas"
  | "David"
  | "Samantha";

export type BusinessType =
  | "seguros"
  | "unas";

export interface Review {
  id: string;
  worker: WorkerName;
  business: BusinessType;
  customerName: string;
  createdAt: string;
}