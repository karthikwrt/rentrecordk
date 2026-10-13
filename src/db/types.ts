export type Mode = 'owner' | 'tenant';
export type Frequency = 'daily' | 'weekly' | 'monthly';

export const FREQUENCIES: Frequency[] = ['monthly', 'weekly', 'daily'];

export type Property = {
  id: number;
  mode: Mode;
  name: string;
  address: string;
  notes: string;
  created_at: string;
};

/** A tenant (in owner mode) or an owner/landlord (in tenant mode). */
export type Person = {
  id: number;
  mode: Mode;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
};

export type Tenancy = {
  id: number;
  mode: Mode;
  property_id: number;
  person_id: number;
  rent_amount: number;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  deposit: number;
  notes: string;
  active: number;
  created_at: string;
};

export type Payment = {
  id: number;
  tenancy_id: number;
  amount: number;
  paid_on: string;
  method: string;
  notes: string;
  created_at: string;
};

/** Tenancy joined with its property/person names and payment total. */
export type TenancyView = Tenancy & {
  property_name: string;
  person_name: string;
  total_paid: number;
};

export type PaymentView = Payment & {
  property_name: string;
  person_name: string;
};
