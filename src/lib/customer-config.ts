// Customer publisher identity used by the entity-diagram views. The same app
// serves any customer; override per deployment via env. The OKF Contoso demo
// sets NEXT_PUBLIC_CUSTOM_PREFIX=con_ and NEXT_PUBLIC_CUSTOM_LABEL=Contoso.
export const CUSTOMER_PREFIX = process.env.NEXT_PUBLIC_CUSTOM_PREFIX || "hsl_";
export const CUSTOMER_LABEL = process.env.NEXT_PUBLIC_CUSTOM_LABEL || "Custom";
