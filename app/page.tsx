import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, LineChart as LineChartIcon, BarChart3, PieChart, Calculator, FileSpreadsheet, RefreshCw, Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart as RPieChart,
  Pie,
  Cell,
} from "recharts";

// -------------------------------------------------
// Types
// -------------------------------------------------

type Period = {
  period: string; // e.g., "2023 Q4" or "2024"
  revenue: number;
  cogs: number;
  opex: number; // operating expenses
  r_and_d?: number;
  sga?: number;
  interest_expense?: number;
  tax_expense?: number;
  net_income: number;
  operating_cash_flow: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
  capex?: number; // if available
  total_assets: number;
  total_liabilities: number;
  shareholders_equity: number;
};

// -------------------------------------------------
// Sample dataset (you can replace via CSV/JSON upload)
// -------------------------------------------------

const SAMPLE: Period[] = [
  {
    period: "2021",
    revenue: 420,
    cogs: 210,
    opex: 120,
    r_and_d: 35,
    sga: 85,
    interest_expense: 8,
    tax_expense: 12,
    net_income: 60,
    operating_cash_flow: 95,
    investing_cash_flow: -40,
    financing_cash_flow: -20,
    capex: 38,
    total_assets: 600,
    total_liabilities: 300,
    shareholders_equity: 300,
  },
  {
    period: "2022",
    revenue: 520,
    cogs: 250,
    opex: 140,
    r_and_d: 40,
    sga: 100,
    interest_expense: 10,
    tax_expense: 15,
    net_income: 80,
    operating_cash_flow: 125,
    investing_cash_flow: -55,
    financing_cash_flow: -30,
    capex: 45,
    total_assets: 680,
    total_liabilities: 340,
    shareholders_equity: 340,
  },
  {
    period: "2023",
    revenue: 630,
    cogs: 290,
    opex: 165,
    r_and_d: 47,
    sga: 118,
    interest_expense: 12,
    tax_expense: 18,
    net_income: 110,
    operating_cash_flow: 150,
    investing_cash_flow: -70,
    financing_cash_flow: -25,
    capex: 52,
    total_assets: 770,
    total_liabilities: 370,
    shareholders_equity: 400,
  },
  {
    period: "2024",
    revenue: 720,
    cogs: 330,
    opex: 180,
    r_and_d: 52,
    sga: 128,
    interest_expense: 13,
    tax_expense: 22,
    net_income: 140,
    operating_cash_flow: 190,
    investing_cash_flow: -80,
    financing_cash_flow: -35,
    capex: 60,
    total_assets: 860,
    total_liabilities: 410,
    shareholders_equity: 450,
  },
];

// -------------------------------------------------
// Utilities
// -------------------------------------------------

const numberFmt = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

const pctFmt = (n: number) => `${(n * 100).toFixed(1)}%`;

// Minimal CSV parser (assumes comma delimiter & header row)
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // naive split that also handles simple quoted fields
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = (cells[idx] ?? "").trim().replace(/^"|"$/g, "")));
    return obj;
  });
}

function coercePeriods(rows: Record<string, string>[]): Period[] {
  const mapKey = (obj: Record<string, string>, keys: string[], fallback = "0") => {
    const found = keys.find((k) => Object.keys(obj).some((ok) => ok.toLowerCase() === k.toLowerCase()));
    const val = found ? obj[Object.keys(obj).find((ok) => ok.toLowerCase() === (found as string).toLowerCase())!] : fallback;
    return val;
  };

  return rows.map((r) => {
    const num = (v: string) => (v === undefined || v === null || v === "" ? 0 : Number(v));
    const get = (k: string[]) => num(mapKey(r, k));
    return {
      period: mapKey(r, ["period", "date", "year", "quarter"], ""),
      revenue: get(["revenue", "sales", "total_revenue"]),
      cogs: get(["cogs", "cost_of_goods_sold", "costs"]),
      opex: get(["opex", "operating_expenses", "operating_expense"]),
      r_and_d: get(["r_and_d", "rnd", "research_development", "research_and_development"]),
      sga: get(["sga", "selling_general_admin", "selling_general_and_administrative"]),
      interest_expense: get(["interest_expense", "interest"]),
      tax_expense: get(["tax_expense", "taxes"]),
      net_income: get(["net_income", "profit", "earnings"]),
      operating_cash_flow: get(["operating_cash_flow", "ocf"]),
      investing_cash_flow: get(["investing_cash_flow", "icf"]),
      financing_cash_flow: get(["financing_cash_flow", "fcf_financing"]),
      capex: get(["capex", "capital_expenditure"]),
      total_assets: get(["total_assets", "assets"]),
      total_liabilities: get(["total_liabilities", "liabilities"]),
      shareholders_equity: get(["shareholders_equity", "equity"]),
    } as Period;
  });
}

function computeKPIs(data: Period[]) {
  const latest = data[data.length - 1];
  const prior = data[data.length - 2] ?? latest;
  const yoy = (a: number, b: number) => (b === 0 ? 0 : (a - b) / b);
  const grossMargin = (p: Period) => (p.revenue === 0 ? 0 : (p.revenue - p.cogs) / p.revenue);
  const opMargin = (p: Period) => (p.revenue === 0 ? 0 : (p.revenue - p.cogs - p.opex) / p.revenue);
  const netMargin = (p: Period) => (p.revenue === 0 ? 0 : p.net_income / p.revenue);
  const debtToEquity = (p: Period) => (p.shareholders_equity === 0 ? 0 : p.total_liabilities / p.shareholders_equity);
  const assetTurnover = (p: Period) => (p.total_assets === 0 ? 0 : p.revenue / p.total_assets);
  const fcf = (p: Period) => p.operating_cash_flow - (p.capex ?? 0);

  return {
    latestPeriod: latest.period,
    revenue: { value: latest.revenue, delta: yoy(latest.revenue, prior.revenue) },
    grossMargin: { value: grossMargin(latest), delta: yoy(grossMargin(latest), grossMargin(prior)) },
    operatingMargin: { value: opMargin(latest), delta: yoy(opMargin(latest), opMargin(prior)) },
    netMargin: { value: netMargin(latest), delta: yoy(netMargin(latest), netMargin(prior)) },
    debtToEquity: { value: debtToEquity(latest), delta: yoy(debtToEquity(latest), debtToEquity(prior)) },
    assetTurnover: { value: assetTurnover(latest), delta: yoy(assetTurnover(latest), assetTurnover(prior)) },
    fcf: { value: fcf(latest), delta: yoy(fcf(latest), fcf(prior)) },
  };
}

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------------------------------------
// Quick self-tests (not a full test runner, but helps catch regressions)
// -------------------------------------------------
function runSelfTests() {
  try {
    console.assert(computeKPIs(SAMPLE).latestPeriod === "2024", "latestPeriod should be 2024");
    const csv = `period,revenue,cogs,opex,net_income,operating_cash_flow,investing_cash_flow,financing_cash_flow,total_assets,total_liabilities,shareholders_equity\n2020,100,40,20,25,30,-10,-5,200,90,110`;
    const rows = coercePeriods(parseCSV(csv));
    console.assert(rows[0].period === "2020" && rows[0].revenue === 100 && rows[0].cogs === 40, "CSV coercion failed");
  } catch (e) {
    console.warn("Self-tests failed:", e);
  }
}
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  runSelfTests();
}

// -------------------------------------------------
// Main Component
// -------------------------------------------------

export default function FinanceVisualizer() {
  const [rows, setRows] = useState<Period[]>(SAMPLE);
  const [series1, setSeries1] = useState("revenue");
  const [series2, setSeries2] = useState("net_income");
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [currency, setCurrency] = useState("USD");

  const data = useMemo(() => {
    if (!range) return rows;
    const startIdx = rows.findIndex((r) => r.period.includes(String(range.start)));
    const endIdx = rows.findIndex((r) => r.period.includes(String(range.end)));
    if (startIdx === -1 || endIdx === -1) return rows;
    return rows.slice(startIdx, endIdx + 1);
  }, [rows, range]);

  const kpis = useMemo(() => computeKPIs(data), [data]);

  const totalCF = useMemo(
    () =>
      data.map((d) => ({
        period: d.period,
        operating: d.operating_cash_flow,
        investing: d.investing_cash_flow,
        financing: d.financing_cash_flow,
        net: d.operating_cash_flow + d.investing_cash_flow + d.financing_cash_flow,
      })),
    [data]
  );

  const structurePie = useMemo(() => {
    const last = data[data.length - 1];
    if (!last) return [] as { name: string; value: number }[];
    return [
      { name: "Assets", value: last.total_assets },
      { name: "Liabilities", value: last.total_liabilities },
      { name: "Equity", value: last.shareholders_equity },
    ];
  }, [data]);

  function onUploadJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) {
          setRows(parsed as Period[]);
        } else {
          alert("JSON should be an array of Period objects.");
        }
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(f);
  }

  function onUploadCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result));
        setRows(coercePeriods(rows));
      } catch (err) {
        alert("Failed to parse CSV.");
      }
    };
    reader.readAsText(f);
  }

  const currencySymbol = useMemo(() => ({ USD: "$", EUR: "€", SEK: "kr" }[currency] ?? ""), [currency]);

  return (
    <div className="min-h-screen w-full bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-semibold tracking-tight">
            Financials Visualizer
          </motion.h1>
          <div className="flex items-center gap-2">
            <Select value={currency} onValueChange={(v) => setCurrency(v)}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Currency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="SEK">SEK</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => downloadJSON("financials.json", rows)}>
              <Download className="mr-2 h-4 w-4" /> Export JSON
            </Button>
            <Button variant="secondary" onClick={() => setRows(SAMPLE)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reset Sample
            </Button>
          </div>
        </div>

        {/* Upload */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg"><Upload className="mr-2 h-5 w-5" /> Import Data</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Upload JSON</Label>
              <Input ref={fileRef} type="file" accept="application/json" onChange={onUploadJSON} />
            </div>
            <div className="space-y-2">
              <Label>Upload CSV</Label>
              <Input type="file" accept=".csv,text/csv" onChange={onUploadCSV} />
            </div>
            <div className="space-y-2">
              <Label>Filter range (start–end year)</Label>
              <div className="flex gap-2">
                <Input placeholder="2022" onChange={(e) => setRange((r) => ({ start: Number(e.target.value) || 0, end: r?.end ?? 9999 }))} />
                <Input placeholder="2024" onChange={(e) => setRange((r) => ({ start: r?.start ?? 0, end: Number(e.target.value) || 9999 }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <KPI title={`Revenue (${kpis.latestPeriod})`} value={`${currencySymbol}${numberFmt(kpis.revenue.value)}`} delta={kpis.revenue.delta} />
          <KPI title="Gross Margin" value={pctFmt(kpis.grossMargin.value)} delta={kpis.grossMargin.delta} />
          <KPI title="Operating Margin" value={pctFmt(kpis.operatingMargin.value)} delta={kpis.operatingMargin.delta} />
          <KPI title="Net Margin" value={pctFmt(kpis.netMargin.value)} delta={kpis.netMargin.delta} />
          <KPI title="Debt / Equity" value={numberFmt(kpis.debtToEquity.value)} delta={kpis.debtToEquity.delta} />
          <KPI title="Free Cash Flow" value={`${currencySymbol}${numberFmt(kpis.fcf.value)}`} delta={kpis.fcf.delta} />
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="revenue"><LineChartIcon className="mr-2 h-4 w-4" /> Revenue & Earnings</TabsTrigger>
            <TabsTrigger value="margins"><BarChart3 className="mr-2 h-4 w-4" /> Margins</TabsTrigger>
            <TabsTrigger value="cash"><LineChartIcon className="mr-2 h-4 w-4" /> Cash Flows</TabsTrigger>
            <TabsTrigger value="structure"><PieChart className="mr-2 h-4 w-4" /> Capital Structure</TabsTrigger>
            <TabsTrigger value="sim"><Calculator className="mr-2 h-4 w-4" /> Simulator</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <FileSpreadsheet className="mr-2 h-5 w-5" /> {series1.replaceAll("_", " ")} vs {series2.replaceAll("_", " ")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex gap-3">
                  <Select value={series1} onValueChange={setSeries1}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select series" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(data[0] ?? {}).filter((k) => k !== "period").map((k) => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={series2} onValueChange={setSeries2}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select series" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(data[0] ?? {}).filter((k) => k !== "period").map((k) => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="h-[340px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => numberFmt(Number(v))} />
                      <Legend />
                      <Line type="monotone" dataKey={series1 as any} dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey={series2 as any} dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="margins">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg"><Calculator className="mr-2 h-5 w-5" /> Margin Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[340px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={
                      data.map((d) => ({
                        period: d.period,
                        gross: d.revenue === 0 ? 0 : (d.revenue - d.cogs) / d.revenue,
                        operating: d.revenue === 0 ? 0 : (d.revenue - d.cogs - d.opex) / d.revenue,
                        net: d.revenue === 0 ? 0 : d.net_income / d.revenue,
                      }))
                    } margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
                      <Tooltip formatter={(v: any) => pctFmt(Number(v))} />
                      <Legend />
                      <Bar dataKey="gross" name="Gross" />
                      <Bar dataKey="operating" name="Operating" />
                      <Bar dataKey="net" name="Net" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cash">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg"><LineChartIcon className="mr-2 h-5 w-5" /> Cash Flow Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[340px] w-full">
                  <ResponsiveContainer>
                    <AreaChart data={totalCF} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => numberFmt(Number(v))} />
                      <Legend />
                      <Area type="monotone" dataKey="operating" name="Operating" stackId="1" strokeWidth={2} />
                      <Area type="monotone" dataKey="investing" name="Investing" stackId="1" strokeWidth={2} />
                      <Area type="monotone" dataKey="financing" name="Financing" stackId="1" strokeWidth={2} />
                      <Line type="monotone" dataKey="net" name="Net Cash" dot={false} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structure">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg"><PieChart className="mr-2 h-5 w-5" /> Balance Sheet Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer>
                      <RPieChart>
                        <Pie data={structurePie} dataKey="value" nameKey="name" outerRadius={110} label>
                          {structurePie.map((_, idx) => (
                            <Cell key={idx} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${currencySymbol}${numberFmt(Number(v))}`} />
                        <Legend />
                      </RPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid gap-3">
                    <Fact label="Assets" value={`${currencySymbol}${numberFmt(structurePie[0]?.value ?? 0)}`} />
                    <Fact label="Liabilities" value={`${currencySymbol}${numberFmt(structurePie[1]?.value ?? 0)}`} />
                    <Fact label="Equity" value={`${currencySymbol}${numberFmt(structurePie[2]?.value ?? 0)}`} />
                    <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                      <p className="flex items-start"><Info className="mr-2 mt-0.5 h-4 w-4" /> Tip: add CAPEX to get Free Cash Flow = OCF - CAPEX. Upload CSV with a <code>capex</code> column for more accurate FCF.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sim">
            <Simulator base={data[data.length - 1]} currencySymbol={currencySymbol} />
          </TabsContent>
        </Tabs>

        {/* Raw table (quick look) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Data Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative max-h-[360px] w-full overflow-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left">
                    {Object.keys(rows[0] ?? {}).map((k) => (
                      <th key={k} className="border-b px-3 py-2 font-medium capitalize">{k.replaceAll("_", " ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {Object.values(r).map((v, j) => (
                        <td key={j} className="border-b px-3 py-2">{typeof v === "number" ? numberFmt(v) : String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Built with Recharts + shadcn/ui + Tailwind. Drop in your CSV/JSON to explore your company’s financials.
        </footer>
      </div>
    </div>
  );
}

function KPI({ title, value, delta }: { title: string; value: string; delta: number }) {
  const positive = delta >= 0;
  const sign = positive ? "+" : "";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="h-full">
        <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
        <CardContent className="flex items-end justify-between">
          <div className="text-2xl font-semibold">{value}</div>
          <div className={`rounded-full px-2 py-1 text-xs ${positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {sign}{(delta * 100).toFixed(1)}%
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Simulator({ base, currencySymbol }: { base: Period; currencySymbol: string }) {
  const [revGrowth, setRevGrowth] = React.useState(0.1); // +10%
  const [cogsMult, setCogsMult] = React.useState(1);
  const [opexMult, setOpexMult] = React.useState(1);
  const [capexPct, setCapexPct] = React.useState(() => (base?.capex && base.revenue ? base.capex / base.revenue : 0.08));
  const [wcPct, setWcPct] = React.useState(0.1); // ΔWC as % of ΔRevenue
  const [interestRate, setInterestRate] = React.useState(() => (base?.total_liabilities ? (base.interest_expense ?? 0) / base.total_liabilities : 0.05));
  const [taxRate, setTaxRate] = React.useState(0.2);
  const [financingDelta, setFinancingDelta] = React.useState(0);

  if (!base) {
    return (
      <Card>
        <CardHeader><CardTitle>Simulator</CardTitle></CardHeader>
        <CardContent>Upload data first to enable the simulator.</CardContent>
      </Card>
    );
  }

  const debt0 = base.total_liabilities;
  const equity0 = base.shareholders_equity;

  const cogsPctBase = base.revenue ? base.cogs / base.revenue : 0;
  const opexPctBase = base.revenue ? base.opex / base.revenue : 0;

  const revenue1 = base.revenue * (1 + revGrowth);
  const cogs1 = revenue1 * (cogsPctBase * cogsMult);
  const opex1 = revenue1 * (opexPctBase * opexMult);
  const ebit1 = revenue1 - cogs1 - opex1;

  const debt1 = Math.max(0, debt0 + financingDelta);
  const interest1 = debt1 * interestRate;
  const ebt1 = ebit1 - interest1;
  const tax1 = (ebt1 > 0 ? ebt1 : 0) * taxRate;
  const netIncome1 = ebt1 - tax1;

  const capex1 = revenue1 * capexPct;
  const deltaWC = wcPct * (revenue1 - base.revenue);
  const ocf1 = netIncome1 - deltaWC; // simplified proxy
  const fcf1 = ocf1 - capex1;
  const finCF1 = financingDelta;
  const netCash1 = fcf1 + finCF1;

  const equity1 = equity0 + netIncome1; // assume no dividends
  const liabilities1 = debt1; // simplify all liabilities as debt in this toy model
  const assets1 = liabilities1 + equity1; // implied to keep BS balanced

  const fmt = (n: number) => `${currencySymbol}${numberFmt(n)}`;

  const incomeData = [
    { name: "Revenue", Base: base.revenue, Sim: revenue1 },
    { name: "COGS", Base: base.cogs, Sim: cogs1 },
    { name: "OPEX", Base: base.opex, Sim: opex1 },
    { name: "EBIT", Base: base.revenue - base.cogs - base.opex, Sim: ebit1 },
    { name: "NI", Base: base.net_income, Sim: netIncome1 },
  ];

  const cfData = [
    { name: "OCF", Base: base.operating_cash_flow, Sim: ocf1 },
    { name: "Capex", Base: base.capex ?? 0, Sim: capex1 },
    { name: "Financing", Base: base.financing_cash_flow, Sim: finCF1 },
    { name: "Net Cash", Base: base.operating_cash_flow + base.investing_cash_flow + base.financing_cash_flow, Sim: netCash1 },
  ];

  const bsBase = [
    { name: "Liabilities", value: base.total_liabilities },
    { name: "Equity", value: base.shareholders_equity },
  ];
  const bsSim = [
    { name: "Liabilities", value: liabilities1 },
    { name: "Equity", value: equity1 },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2"><CardTitle>Assumptions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Revenue growth: {(revGrowth * 100).toFixed(0)}%</Label>
            <input type="range" min="-0.5" max="0.5" step="0.01" value={revGrowth} onChange={(e) => setRevGrowth(parseFloat(e.target.value))} className="w-full" />
          </div>
          <div>
            <Label>COGS multiplier: {cogsMult.toFixed(2)}×</Label>
            <input type="range" min="0.5" max="1.5" step="0.01" value={cogsMult} onChange={(e) => setCogsMult(parseFloat(e.target.value))} className="w-full" />
          </div>
          <div>
            <Label>OPEX multiplier: {opexMult.toFixed(2)}×</Label>
            <input type="range" min="0.5" max="1.5" step="0.01" value={opexMult} onChange={(e) => setOpexMult(parseFloat(e.target.value))} className="w-full" />
          </div>
          <div>
            <Label>Capex as % of revenue: {(capexPct * 100).toFixed(1)}%</Label>
            <input type="range" min="0" max="0.3" step="0.005" value={capexPct} onChange={(e) => setCapexPct(parseFloat(e.target.value))} className="w-full" />
          </div>
          <div>
            <Label>ΔWorking capital as % of ΔRevenue: {(wcPct * 100).toFixed(0)}%</Label>
            <input type="range" min="-0.5" max="0.5" step="0.01" value={wcPct} onChange={(e) => setWcPct(parseFloat(e.target.value))} className="w-full" />
          </div>
          <div>
            <Label>Interest rate on debt: {(interestRate * 100).toFixed(1)}%</Label>
            <input type="range" min="0" max="0.3" step="0.005" value={interestRate} onChange={(e) => setInterestRate(parseFloat(e.target.value))} className="w-full" />
          </div>
          <div>
            <Label>Tax rate: {(taxRate * 100).toFixed(0)}%</Label>
            <input type="range" min="0" max="0.5" step="0.01" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value))} className="w-full" />
          </div>
          <div>
            <Label>Financing (Δ debt): {fmt(financingDelta)}</Label>
            <input type="range" min="-500" max="500" step="5" value={financingDelta} onChange={(e) => setFinancingDelta(parseFloat(e.target.value))} className="w-full" />
          </div>
          <div className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
            This is a simplified one-period model meant for quick scenario exploration, not GAAP/IFRS-grade forecasting.
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle>Income Statement (Base vs Sim)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart data={incomeData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="Base" />
                  <Bar dataKey="Sim" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle>Cash Flow (Base vs Sim)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart data={cfData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="Base" />
                  <Bar dataKey="Sim" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle>Balance Sheet Structure</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <RPieChart>
                    <Pie data={bsBase} dataKey="value" nameKey="name" outerRadius={100} label>
                      {bsBase.map((_, i) => (<Cell key={i} />))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Legend />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <RPieChart>
                    <Pie data={bsSim} dataKey="value" nameKey="name" outerRadius={100} label>
                      {bsSim.map((_, i) => (<Cell key={i} />))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Legend />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
