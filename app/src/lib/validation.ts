import { z } from "zod";

const req = (msg: string) => z.string().min(1, msg);

const personSchema = z
  .object({
    is_company: z.boolean(),
    full_name: z.string(),
    ci: z.string(),
    company_name: z.string(),
    rut: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.is_company) {
      if (!data.company_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Razón social es obligatoria",
          path: ["company_name"],
        });
      }
      if (!data.rut.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "RUT es obligatorio",
          path: ["rut"],
        });
      }
    } else {
      if (!data.full_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nombre completo es obligatorio",
          path: ["full_name"],
        });
      }
      if (!data.ci.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cédula es obligatoria",
          path: ["ci"],
        });
      }
    }
  });

const vehicleSchema = z.object({
  brand: req("Marca es obligatoria"),
  model: req("Modelo es obligatorio"),
  plate: req("Matrícula es obligatoria"),
  padron: req("Padrón es obligatorio"),
});

const priceSchema = z
  .object({
    amount: z.string(),
    currency: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.amount.trim() || parseFloat(data.amount) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Monto es obligatorio y debe ser mayor a 0",
        path: ["amount"],
      });
    }
    if (!data.currency.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Moneda es obligatoria",
        path: ["currency"],
      });
    }
  });

export type ValidationErrors = Record<string, string>;

/**
 * Maps form field names to their validation schema paths.
 * Returns a record of field_name → error_message for all failing fields.
 */
export function validateTransactionForm(form: Record<string, unknown>): ValidationErrors {
  const errors: ValidationErrors = {};

  // Seller validation
  const sellerResult = personSchema.safeParse({
    is_company: form.seller_is_company,
    full_name: form.seller_full_name ?? "",
    ci: form.seller_ci ?? "",
    company_name: form.seller_company_name ?? "",
    rut: form.seller_rut ?? "",
  });
  if (!sellerResult.success) {
    for (const issue of sellerResult.error.issues) {
      const field = `seller_${String(issue.path[0])}`;
      errors[field] = issue.message;
    }
  }

  // Buyer validation
  const buyerResult = personSchema.safeParse({
    is_company: form.buyer_is_company,
    full_name: form.buyer_full_name ?? "",
    ci: form.buyer_ci ?? "",
    company_name: form.buyer_company_name ?? "",
    rut: form.buyer_rut ?? "",
  });
  if (!buyerResult.success) {
    for (const issue of buyerResult.error.issues) {
      const field = `buyer_${String(issue.path[0])}`;
      errors[field] = issue.message;
    }
  }

  // Vehicle validation
  const vehicleResult = vehicleSchema.safeParse({
    brand: form.vehicle_brand ?? "",
    model: form.vehicle_model ?? "",
    plate: form.vehicle_plate ?? "",
    padron: form.vehicle_padron ?? "",
  });
  if (!vehicleResult.success) {
    for (const issue of vehicleResult.error.issues) {
      const field = `vehicle_${String(issue.path[0])}`;
      errors[field] = issue.message;
    }
  }

  // Price validation
  const priceResult = priceSchema.safeParse({
    amount: form.price_amount ?? "",
    currency: form.price_currency ?? "",
  });
  if (!priceResult.success) {
    for (const issue of priceResult.error.issues) {
      const field = `price_${String(issue.path[0])}`;
      errors[field] = issue.message;
    }
  }

  return errors;
}
