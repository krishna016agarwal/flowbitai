"use client";

import React, { useEffect, useState } from "react";
// Import all necessary Chart.js elements
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
} from "chart.js";
import { Doughnut, Line, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

// --- Interface Definitions ---
interface SummaryData {
  totalSpendYTD: number;
  totalInvoicesProcessed: number;
  documentsUploaded: number;
  averageInvoiceValue: number;
  currencySymbol?: string;
}

interface VendorSummary {
  vendorName: string;
  invoiceCount: number;
  netValue: number;
}

interface CategorySpend {
  category: string;
  spend: number;
}

interface CashOutflow {
  dueDate: string;
  total: number;
}

interface InvoiceTrend {
  month: string;
  invoiceCount: number;
  totalSpend: number;
}

interface DashboardProps {
  width?: string;
}
// --- End Interface Definitions ---

// Helper function to format currency consistently
const formatCurrency = (value: number, symbol: string = "€") =>
  `${symbol} ${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

export default function Dashboard({ width = "80%" }: DashboardProps) {
  const [summary, setSummary] = useState<SummaryData>({
    totalSpendYTD: 0,
    totalInvoicesProcessed: 0,
    documentsUploaded: 0,
    averageInvoiceValue: 0,
    currencySymbol: "€",
  });

  const [vendorInvoices, setVendorInvoices] = useState<VendorSummary[]>([]);
  const [lineData, setLineData] = useState<any>({ labels: [], datasets: [] });
  const [barData, setBarData] = useState<any>({ labels: [], datasets: [] });
  const [doughnutData, setDoughnutData] = useState<any>({ labels: [], datasets: [] });
  const [forecastData, setForecastData] = useState<any>({ labels: [], datasets: [] });

  useEffect(() => {
    // 1. Fetch summary stats
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setSummary({
          totalSpendYTD: data.totalPayments,
          totalInvoicesProcessed: data.totalInvoices,
          documentsUploaded: data.totalInvoices,
          averageInvoiceValue: data.totalInvoices ? data.totalPayments / data.totalInvoices : 0,
          currencySymbol: "€",
        });
      })
      .catch((error) => console.error("Failed to fetch stats:", error));

    // 2. Fetch top vendors
    fetch("/api/vendors/top10")
      .then((res) => res.json())
      .then((data: VendorSummary[]) => {
        if (Array.isArray(data)) {
          setVendorInvoices(data);
          setBarData({
            labels: data.map((v) => v.vendorName),
            datasets: [
              {
                label: "Spend (€)",
                data: data.map((v) => v.netValue),
                backgroundColor: "#3b82f6",
              },
            ],
          });
        } else {
          setVendorInvoices([]);
        }
      })
      .catch((error) => {
        console.error("Error fetching vendor data:", error);
        setVendorInvoices([]);
      });

    // 3. Fetch invoice trends
    fetch("/api/invoice-trends")
      .then((res) => res.json())
      .then((data: InvoiceTrend[]) => {
        setLineData({
          labels: data.map((d) => d.month),
          datasets: [
            {
              label: "Invoices Processed",
              data: data.map((d) => d.invoiceCount),
              borderColor: "#2563eb",
              backgroundColor: "rgba(37, 99, 235, 0.2)",
              tension: 0.4,
              fill: true,
            },
            {
              label: "Total Spend (€)",
              data: data.map((d) => d.totalSpend),
              borderColor: "#16a34a",
              backgroundColor: "rgba(22, 163, 74, 0.2)",
              tension: 0.4,
              fill: true,
              yAxisID: "y1",
            },
          ],
        });
      })
      .catch((error) => console.error("Failed to fetch trends:", error));

    // 4. Fetch category spend
    fetch("/api/category-spend")
      .then((res) => res.json())
      .then((data: CategorySpend[]) => {
        data.sort((a, b) => b.spend - a.spend);
        setDoughnutData({
          labels: data.map((d) => d.category),
          datasets: [
            {
              data: data.map((d) => d.spend),
              backgroundColor: ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#9333ea", "#06b6d4"],
              hoverOffset: 8,
            },
          ],
        });
      })
      .catch((error) => console.error("Failed to fetch category spend:", error));

    // 5. Fetch cash outflow (no dates required)
    fetch("/api/cash-outflow")
      .then((res) => res.json())
      .then((data: CashOutflow[]) => {
        setForecastData({
          labels: data.map((d) =>
            new Date(d.dueDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
          ),
          datasets: [
            {
              label: "Expected Outflow (€)",
              data: data.map((d) => d.total),
              backgroundColor: "rgba(59, 130, 246, 0.6)",
            },
          ],
        });
      })
      .catch((error) => console.error("Failed to fetch cash outflow:", error));
  }, []);

  const renderVendorInvoicesTable = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 overflow-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoices by Vendor</h3>
      <p className="text-sm text-gray-500 mb-4">Top vendors by invoice count and net value.</p>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"># Invoices</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Value</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.isArray(vendorInvoices) && vendorInvoices.length > 0 ? (
            vendorInvoices.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.vendorName}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{item.invoiceCount}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                  {formatCurrency(item.netValue, summary.currencySymbol)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-3 py-4 text-center text-sm text-gray-500">
                No vendor data found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderNewSummaryCard = (title: string, value: string | number, trend: string, trendClass: string) => (
    <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      <div className="flex justify-between items-center text-xs mt-1">
        <span className={trendClass}>{trend}</span>
      </div>
    </div>
  );

  return (
    <main className="bg-gray-50 p-6 md:p-10 min-h-screen overflow-auto" style={{ width }}>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {renderNewSummaryCard(
          "Total Spend (YTD)",
          formatCurrency(summary.totalSpendYTD, summary.currencySymbol),
          "+8.2% from last month",
          "text-green-500"
        )}
        {renderNewSummaryCard("Total Invoices Processed", summary.totalInvoicesProcessed, "+5% growth", "text-green-500")}
        {renderNewSummaryCard("Documents Uploaded", summary.documentsUploaded, "-2 fewer", "text-red-500")}
        {renderNewSummaryCard(
          "Average Invoice Value",
          formatCurrency(summary.averageInvoiceValue, summary.currencySymbol),
          "+3% increase",
          "text-green-500"
        )}
      </div>

      {/* Trend + Vendor Spend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Volume + Value Trend</h3>
          {lineData?.datasets?.length ? <Line data={lineData} /> : <p>Loading trend chart...</p>}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Spend by Vendor (Top 10)</h3>
          <div className="h-[350px]">
            {barData?.datasets?.length ? (
              <Bar
                data={barData}
                options={{
                  indexAxis: "y" as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            ) : (
              <p>Loading vendor spend chart...</p>
            )}
          </div>
        </div>
      </div>

      {/* Distribution Charts + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Spend by Category</h3>
          {doughnutData?.datasets?.length ? (
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        let label = context.label || "";
                        if (label) label += ": ";
                        if (context.parsed !== null) label += formatCurrency(context.parsed, summary.currencySymbol);
                        return label;
                      },
                    },
                  },
                },
              }}
            />
          ) : (
            <p>Loading category spend chart...</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Cash Outflow Forecast</h3>
          <div className="h-[350px]">
            {forecastData?.datasets?.length ? (
              <Bar
                data={forecastData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      min: 0,
                      ticks: {
                        callback: (value) =>
                          formatCurrency(value as number, summary.currencySymbol).split(" ")[0],
                      },
                    },
                  },
                }}
              />
            ) : (
              <p>Loading cash outflow forecast...</p>
            )}
          </div>
        </div>

        {renderVendorInvoicesTable()}
      </div>
    </main>
  );
}
