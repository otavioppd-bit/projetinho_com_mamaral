/* Ilustrações geradas para a Zona de Aprendizado.
   Cada módulo tem um banner temático; o mentor tem um avatar próprio. */

export const MODULE_IMAGES: Record<string, string> = {
  perguntas:
    "https://image.qwenlm.ai/generated-images/0f5e6423-c475-443d-9751-ce8ffcc49913/_result.png",
  extracao:
    "https://image.qwenlm.ai/generated-images/3a6de0c9-4742-401e-9d9e-0b3c79412724/_result.png",
  limpeza:
    "https://image.qwenlm.ai/generated-images/3a417ddf-0a9e-48c8-98bc-0b7268713024/_result.png",
  sql: "https://image.qwenlm.ai/generated-images/44bbaa34-27c0-4d57-9b0f-ca3e21310c3a/_result.png",
  graficos:
    "https://image.qwenlm.ai/generated-images/f1d19b62-84be-444c-a06f-e7eded51e1e1/_result.png",
  matematica:
    "https://image.qwenlm.ai/generated-images/3c9cc7db-5667-4774-b812-b8c5b3d92d24/_result.png",
};

export const MENTOR_AVATAR =
  "https://image.qwenlm.ai/generated-images/ff7c8cf8-ff76-4dcc-b2a1-82774dee495f/_result.png";

/* módulos das trilhas Pleno/Sênior reaproveitam o banner mais próximo */
export const IMAGE_ALIAS: Record<string, string> = {
  modelagem: "sql",
  metricas: "graficos",
  "plataforma-tableau": "graficos",
  "plataforma-powerbi": "graficos",
  "sql-avancado": "sql",
  estatistica: "matematica",
  arquitetura: "extracao",
  governanca: "limpeza",
  experimentacao: "matematica",
  "plataformas-eco": "graficos",
  gestao: "perguntas",
  preditivo: "matematica",
};
