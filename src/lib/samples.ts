/* Datasets de demonstração — gerados com semente fixa e
   "sujeira" intencional (nulos, duplicatas, outliers) para o
   motor de limpeza demonstrar o trabalho real. */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const esc = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(esc).join(",")).join("\n");

export interface SampleMeta {
  id: string;
  name: string;
  file: string;
  desc: string;
  rows: number;
  cols: number;
  tags: string[];
}

/* ------------------------------------------------ ecommerce */
function buildEcommerce(): string {
  const rnd = mulberry32(20240612);
  const regioes = ["Sudeste", "Sudeste", "Sudeste", "Sul", "Sul", "Nordeste", "Nordeste", "Centro-Oeste", "Norte"];
  const cats: [string, number, number][] = [
    ["Eletrônicos", 620, 90],
    ["Moda", 180, 45],
    ["Casa & Deco", 260, 60],
    ["Esporte", 230, 55],
    ["Beleza", 120, 30],
  ];
  const canais = ["Online", "Online", "Online", "Marketplace", "Marketplace", "Loja Física"];
  const rows: (string | number)[][] = [
    ["data", "regiao", "categoria", "canal", "unidades", "receita", "ticket_medio", "avaliacao"],
  ];
  for (let i = 0; i < 340; i++) {
    const month = Math.floor(rnd() * 12);
    const day = 1 + Math.floor(rnd() * 28);
    const date = `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/2024`;
    const [cat, base, spread] = cats[Math.floor(rnd() * cats.length)];
    const season = 1 + month * 0.055 + (month === 10 ? 0.35 : 0);
    const unidades = 1 + Math.floor(rnd() * 26);
    const ticket = Math.max(30, base + (rnd() - 0.5) * 2 * spread);
    let receita = unidades * ticket * season * (0.85 + rnd() * 0.3);
    if (i === 77 || i === 190 || i === 265) receita *= 9.5; // outliers legítimos: pedidos B2B
    const receitaStr = i % 29 === 13 ? "" : receita.toFixed(2); // ~3,5% nulos
    const aval = i % 37 === 9 ? "N/A" : (3 + rnd() * 2).toFixed(1);
    rows.push([
      date,
      regioes[Math.floor(rnd() * regioes.length)],
      cat,
      canais[Math.floor(rnd() * canais.length)],
      unidades,
      receitaStr,
      ticket.toFixed(2),
      aval,
    ]);
  }
  // duplicatas exatas
  rows.push(rows[40], rows[120], rows[120], rows[230], rows[300], rows[55], rows[180], rows[205]);
  return toCsv(rows);
}

/* ------------------------------------------------ clínica */
function buildClinico(): string {
  const rnd = mulberry32(99173);
  const rows: (string | number)[][] = [
    ["paciente_id", "idade", "sexo", "grupo", "pressao_sistolica", "colesterol_ldl", "glicemia", "peso_kg", "recuperacao_dias"],
  ];
  for (let i = 0; i < 200; i++) {
    let idade = 22 + Math.floor(rnd() * 56);
    if (i === 51) idade = 97; // outlier
    const grupo = ["Controle", "Tratamento A", "Tratamento B"][Math.floor(rnd() * 3)];
    const gBase = grupo === "Controle" ? 15 : grupo === "Tratamento A" ? 11 : 8;
    const rec = Math.max(2, Math.round(gBase + idade * 0.06 + (rnd() - 0.5) * 6));
    const peso = (48 + rnd() * 70).toFixed(1);
    rows.push([
      `P-${String(1000 + i)}`,
      idade,
      rnd() > 0.47 ? "F" : "M",
      grupo,
      Math.round(105 + rnd() * 55 + idade * 0.12),
      Math.round(70 + rnd() * 120),
      i % 13 === 5 ? "n/a" : Math.round(70 + rnd() * 70), // ~8% nulos
      i % 23 === 11 ? "—" : peso,
      rec,
    ]);
  }
  rows.push(rows[18], rows[90], rows[90], rows[144]);
  return toCsv(rows);
}

/* ------------------------------------------------ telemetria */
function buildTelemetria(): string {
  const rnd = mulberry32(555001);
  const sensores = ["S-01", "S-02", "S-03", "S-04", "S-05", "S-06"];
  const rows: (string | number)[][] = [
    ["timestamp", "sensor", "temperatura_c", "umidade_pct", "vibracao_mms", "consumo_wh", "status"],
  ];
  const start = Date.UTC(2025, 2, 1, 0, 0, 0);
  for (let d = 0; d < 14; d++) {
    for (const s of sensores) {
      for (const h of [2, 8, 14, 20]) {
        const ts = new Date(start + d * 86_400_000 + h * 3_600_000);
        const iso = ts.toISOString().slice(0, 16).replace("T", " ");
        const diurna = Math.sin(((h - 4) / 24) * Math.PI * 2) * 3.2;
        const offset = parseInt(s.slice(2)) * 0.35;
        let temp = 24 + diurna + offset + (rnd() - 0.5) * 1.8;
        const tempStr = rnd() < 0.045 ? "" : temp.toFixed(1); // nulos esparsos
        const umid = Math.max(34, 62 - (temp - 21) * 4.1 + (rnd() - 0.5) * 6); // inversa de temperatura
        let vib = 2.2 + rnd() * 2.4;
        if (s === "S-03" && rnd() < 0.22) vib = 11 + rnd() * 7; // sensor degradando: spikes
        const consumo = 180 + (temp - 20) * 26 + rnd() * 40; // correlacionado c/ temperatura
        const status = vib > 10 ? (rnd() < 0.5 ? "FALHA" : "ALERTA") : vib > 6.5 ? "ALERTA" : "OK";
        temp = tempStr === "" ? temp : temp;
        rows.push([iso, s, tempStr, umid.toFixed(1), vib.toFixed(2), consumo.toFixed(0), status]);
      }
    }
  }
  rows.push(rows[30], rows[150], rows[150], rows[260], rows[310]);
  return toCsv(rows);
}

export const SAMPLES: (SampleMeta & { build: () => string })[] = [
  {
    id: "ecommerce",
    name: "Vendas · e-commerce 2024",
    file: "vendas_ecommerce_2024.csv",
    desc: "Receita, canais e avaliações com sazonalidade — contém nulos, duplicatas e 3 pedidos B2B extremos.",
    rows: 348,
    cols: 8,
    tags: ["série temporal", "outliers", "R$"],
    build: buildEcommerce,
  },
  {
    id: "clinico",
    name: "Ensaio clínico · fase II",
    file: "ensaios_fase2.csv",
    desc: "Biomarcadores por grupo de tratamento, com ~8% de glicemias ausentes e um idoso de 97 anos.",
    rows: 204,
    cols: 9,
    tags: ["saúde", "nulos", "grupos A/B"],
    build: buildClinico,
  },
  {
    id: "telemetria",
    name: "Telemetria industrial · 6 sensores",
    file: "telemetria_sensores.csv",
    desc: "Temperatura, umidade e vibração a cada 6h — o sensor S-03 está degradando com spikes reais.",
    rows: 341,
    cols: 7,
    tags: ["IoT", "correlações", "anomalias"],
    build: buildTelemetria,
  },
];
