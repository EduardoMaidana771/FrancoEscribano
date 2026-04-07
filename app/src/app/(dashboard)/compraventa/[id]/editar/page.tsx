import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import TransactionForm from "@/components/TransactionForm";
import type { Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarCompraventaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch transaction with all joined data
  const { data: tx, error } = await supabase
    .from("transactions")
    .select(
      `
      *,
      seller:clients!transactions_seller_id_fkey(*),
      seller2:clients!transactions_seller2_id_fkey(*),
      buyer:clients!transactions_buyer_id_fkey(*),
      buyer2:clients!transactions_buyer2_id_fkey(*),
      vehicle:vehicles!transactions_vehicle_id_fkey(*)
    `
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !tx) notFound();

  // Normalize joined data (Supabase may return arrays)
  const seller = Array.isArray(tx.seller) ? tx.seller[0] : tx.seller;
  const seller2 = Array.isArray(tx.seller2) ? tx.seller2[0] : tx.seller2;
  const buyer = Array.isArray(tx.buyer) ? tx.buyer[0] : tx.buyer;
  const buyer2 = Array.isArray(tx.buyer2) ? tx.buyer2[0] : tx.buyer2;
  const vehicle = Array.isArray(tx.vehicle) ? tx.vehicle[0] : tx.vehicle;

  const { data: profile } = await supabase
    .from("profiles")
    .select("next_matriz_number, next_folio_number")
    .eq("id", user.id)
    .single();

  // Parse plate_history_entries from JSON string
  let plateHistoryEntries: { department: string; padron: string; matricula: string; date: string }[] = [];
  if (tx.plate_history_entries) {
    try {
      plateHistoryEntries =
        typeof tx.plate_history_entries === "string"
          ? JSON.parse(tx.plate_history_entries)
          : tx.plate_history_entries;
    } catch {
      plateHistoryEntries = [];
    }
  }

  // Map DB data to form fields
  const initialData = {
    // Seller
    seller_full_name: seller?.full_name ?? "",
    seller_ci: seller?.ci_number ?? "",
    seller_nationality: seller?.nationality ?? "uruguaya",
    seller_birth_date: seller?.birth_date ?? "",
    seller_birth_place: seller?.birth_place ?? "",
    seller_civil_status: seller?.civil_status ?? "soltero",
    seller_civil_status_detail: seller?.civil_status_detail ?? "",
    seller_nupcias_type: seller?.nupcias_type ?? "",
    seller_spouse_name: seller?.spouse_name ?? "",
    seller_divorce_ficha: seller?.divorce_ficha ?? "",
    seller_divorce_year: seller?.divorce_year ?? "",
    seller_divorce_court: seller?.divorce_court ?? "",
    seller_address: seller?.address ?? "",
    seller_department: seller?.department ?? "",
    seller_phone: seller?.phone ?? "",
    seller_is_company: seller?.is_company ?? false,
    seller_company_name: seller?.company_name ?? "",
    seller_company_type: seller?.company_type ?? "",
    seller_rut: seller?.rut ?? "",
    seller_company_registry_number: seller?.company_registry_number ?? "",
    seller_company_registry_folio: seller?.company_registry_folio ?? "",
    seller_company_registry_book: seller?.company_registry_book ?? "",
    seller_company_business_purpose: seller?.company_business_purpose ?? "",
    seller_company_law_19484: seller?.company_law_19484 ?? false,
    seller_representative_name: seller?.representative_name ?? "",
    seller_representative_ci: seller?.representative_ci ?? "",
    seller_representative_role: seller?.representative_role ?? "",
    seller_representative_address: seller?.representative_address ?? "",
    // Seller 2
    has_seller2: !!seller2,
    seller2_full_name: seller2?.full_name ?? "",
    seller2_ci: seller2?.ci_number ?? "",
    seller2_nationality: seller2?.nationality ?? "uruguaya",
    seller2_birth_date: seller2?.birth_date ?? "",
    seller2_birth_place: seller2?.birth_place ?? "",
    seller2_civil_status: seller2?.civil_status ?? "casado",
    seller2_civil_status_detail: seller2?.civil_status_detail ?? "",
    seller2_nupcias_type: seller2?.nupcias_type ?? "",
    seller2_address: seller2?.address ?? "",
    seller2_department: seller2?.department ?? "",
    // Seller representative
    seller_has_representative: tx.seller_has_representative ?? false,
    seller_rep_name: tx.seller_representative_name ?? "",
    seller_rep_ci: tx.seller_representative_ci ?? "",
    seller_rep_address: tx.seller_representative_address ?? "",
    seller_rep_power_date: tx.seller_representative_power_date ?? "",
    seller_rep_power_notary: tx.seller_representative_power_notary ?? "",
    seller_rep_power_protocol_date: tx.seller_representative_power_protocol_date ?? "",
    seller_rep_power_type: tx.seller_representative_power_type ?? "",
    seller_rep_can_substitute: tx.seller_representative_can_substitute ?? false,
    // Buyer
    buyer_full_name: buyer?.full_name ?? "",
    buyer_ci: buyer?.ci_number ?? "",
    buyer_nationality: buyer?.nationality ?? "uruguaya",
    buyer_birth_date: buyer?.birth_date ?? "",
    buyer_birth_place: buyer?.birth_place ?? "",
    buyer_civil_status: buyer?.civil_status ?? "soltero",
    buyer_civil_status_detail: buyer?.civil_status_detail ?? "",
    buyer_nupcias_type: buyer?.nupcias_type ?? "",
    buyer_spouse_name: buyer?.spouse_name ?? "",
    buyer_divorce_ficha: buyer?.divorce_ficha ?? "",
    buyer_divorce_year: buyer?.divorce_year ?? "",
    buyer_divorce_court: buyer?.divorce_court ?? "",
    buyer_address: buyer?.address ?? "",
    buyer_department: buyer?.department ?? "",
    buyer_phone: buyer?.phone ?? "",
    buyer_is_company: buyer?.is_company ?? false,
    buyer_company_name: buyer?.company_name ?? "",
    buyer_company_type: buyer?.company_type ?? "",
    buyer_rut: buyer?.rut ?? "",
    buyer_company_registry_number: buyer?.company_registry_number ?? "",
    buyer_company_registry_folio: buyer?.company_registry_folio ?? "",
    buyer_company_registry_book: buyer?.company_registry_book ?? "",
    buyer_company_business_purpose: buyer?.company_business_purpose ?? "",
    buyer_company_law_19484: buyer?.company_law_19484 ?? false,
    buyer_representative_name: buyer?.representative_name ?? "",
    buyer_representative_ci: buyer?.representative_ci ?? "",
    buyer_representative_role: buyer?.representative_role ?? "",
    buyer_representative_address: buyer?.representative_address ?? "",
    // Buyer 2
    has_buyer2: !!buyer2,
    buyer2_full_name: buyer2?.full_name ?? "",
    buyer2_ci: buyer2?.ci_number ?? "",
    buyer2_nationality: buyer2?.nationality ?? "uruguaya",
    buyer2_birth_date: buyer2?.birth_date ?? "",
    buyer2_birth_place: buyer2?.birth_place ?? "",
    buyer2_civil_status: buyer2?.civil_status ?? "casado",
    buyer2_civil_status_detail: buyer2?.civil_status_detail ?? "",
    buyer2_nupcias_type: buyer2?.nupcias_type ?? "",
    buyer2_address: buyer2?.address ?? "",
    buyer2_department: buyer2?.department ?? "",
    // Buyer representative
    buyer_has_representative: tx.buyer_has_representative ?? false,
    buyer_rep_name: tx.buyer_representative_name ?? "",
    buyer_rep_ci: tx.buyer_representative_ci ?? "",
    buyer_rep_address: tx.buyer_representative_address ?? "",
    buyer_rep_power_date: tx.buyer_representative_power_date ?? "",
    buyer_rep_power_notary: tx.buyer_representative_power_notary ?? "",
    buyer_rep_power_protocol_date: tx.buyer_representative_power_protocol_date ?? "",
    buyer_rep_power_type: tx.buyer_representative_power_type ?? "",
    buyer_rep_can_substitute: tx.buyer_representative_can_substitute ?? false,
    // Vehicle
    vehicle_brand: vehicle?.brand ?? "",
    vehicle_brand_dgr_id: vehicle?.brand_dgr_id ?? "",
    vehicle_model: vehicle?.model ?? "",
    vehicle_model_dgr_id: vehicle?.model_dgr_id ?? "",
    vehicle_year: vehicle?.year?.toString() ?? "",
    vehicle_type: vehicle?.type ?? "",
    vehicle_type_dgr_id: vehicle?.type_dgr_id ?? "",
    vehicle_fuel: vehicle?.fuel ?? "nafta",
    vehicle_fuel_dgr_id: vehicle?.fuel_dgr_id ?? "",
    vehicle_cylinders: vehicle?.cylinders?.toString() ?? "",
    vehicle_motor_number: vehicle?.motor_number ?? "",
    vehicle_chassis_number: vehicle?.chassis_number ?? "",
    vehicle_plate: vehicle?.plate ?? "",
    vehicle_padron: vehicle?.padron ?? "",
    vehicle_padron_department: vehicle?.padron_department ?? "",
    vehicle_national_code: vehicle?.national_code ?? "",
    vehicle_affectation: vehicle?.affectation ?? "particular",
    vehicle_owner_name: vehicle?.owner_name ?? "",
    vehicle_owner_ci: vehicle?.owner_ci ?? "",
    // Price & payment
    price_amount: tx.price_amount?.toString() ?? "",
    price_currency: tx.price_currency ?? "USD",
    price_in_words: tx.price_in_words ?? "",
    payment_type: tx.payment_type ?? "contado",
    payment_detail: tx.payment_detail ?? "",
    payment_installments_count: tx.payment_installments_count?.toString() ?? "",
    payment_installment_amount: tx.payment_installment_amount?.toString() ?? "",
    payment_cash_amount: tx.payment_cash_amount?.toString() ?? "",
    payment_bank_name: tx.payment_bank_name ?? "",
    payment_third_party_name: tx.payment_third_party_name ?? "",
    payment_third_party_ci: tx.payment_third_party_ci ?? "",
    // Tax
    bps_status: tx.bps_status ?? "no",
    irae_status: tx.irae_status ?? "no",
    imeba_status: tx.imeba_status ?? "no",
    bps_cert_number: tx.bps_cert_number ?? "",
    bps_cert_date: tx.bps_cert_date ?? "",
    cud_number: tx.cud_number ?? "",
    cud_date: tx.cud_date ?? "",
    // Previous title
    previous_owner_name: tx.previous_owner_name ?? "",
    previous_title_date: tx.previous_title_date ?? "",
    previous_title_notary: tx.previous_title_notary ?? "",
    previous_title_same_notary: tx.previous_title_same_notary ?? false,
    previous_title_registry: tx.previous_title_registry ?? "",
    previous_title_number: tx.previous_title_number ?? "",
    previous_title_registry_date: tx.previous_title_registry_date ?? "",
    previous_title_type: tx.previous_title_type ?? "",
    previous_title_is_first_registration: tx.previous_title_is_first_registration ?? false,
    // Insurance
    insurance_policy_number: tx.insurance_policy_number ?? "",
    insurance_company: tx.insurance_company ?? "",
    insurance_expiry: tx.insurance_expiry ?? "",
    insurance_separate_cert: tx.insurance_separate_cert ?? false,
    // Plate history
    has_plate_history: tx.has_plate_history ?? false,
    plate_history_entries: plateHistoryEntries,
    // Extra
    election_declaration: tx.election_declaration ?? "",
    has_traffic_responsibility_clause: tx.has_traffic_responsibility_clause ?? false,
    traffic_responsibility_date: tx.traffic_responsibility_date ?? "",
    // Date
    transaction_date: tx.transaction_date ?? new Date().toISOString().split("T")[0],
    // Proto
    paper_series_proto: tx.paper_series_proto ?? "",
    paper_number_proto: tx.paper_number_proto ?? "",
    paper_series_testimony: tx.paper_series_testimony ?? "",
    paper_numbers_testimony: tx.paper_numbers_testimony ?? "",
  };

  const editIds = {
    transactionId: tx.id,
    sellerId: seller?.id ?? null,
    seller2Id: seller2?.id ?? null,
    buyerId: buyer?.id ?? null,
    buyer2Id: buyer2?.id ?? null,
    vehicleId: vehicle?.id ?? null,
    currentStatus: tx.status as "borrador" | "completado",
  };

  return (
    <TransactionForm
      userId={user.id}
      nextMatriz={profile?.next_matriz_number ?? 133}
      nextFolio={profile?.next_folio_number ?? 1}
      initialData={initialData}
      editIds={editIds}
    />
  );
}
