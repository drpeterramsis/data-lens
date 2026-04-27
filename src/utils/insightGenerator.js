import { safeStr } from "./safeCSV";

export const generateInsights = (rows, mrData, dateData) => {
  const insights = [];
  if (!rows?.length) return insights;

  const total = rows.length;

  // ── INSIGHT 1: Top Performer ──────────────
  if (mrData?.length > 0) {
    const top = mrData[0];
    const avg = Math.round(
      mrData.reduce((s, m) => s + m.total, 0) / mrData.length
    );
    const aboveAvg = (
      ((top.total - avg) / avg) * 100
    ).toFixed(0);

    insights.push({
      id:     "top-mr",
      color:  "green",
      icon:   "🏆",
      title:  `Top Performer: ${top.mrName}`,
      text:   `Led the team with ${top.total.toLocaleString()} calls — ${aboveAvg}% above team average of ${avg}.`,
      metric: `${top.total} calls`,
    });
  }

  // ── INSIGHT 2: Lowest Performer ───────────
  if (mrData?.length > 1) {
    const low = mrData[mrData.length - 1];
    insights.push({
      id:     "low-mr",
      color:  "red",
      icon:   "⚠️",
      title:  `Needs Attention: ${low.mrName}`,
      text:   `Recorded only ${low.total} calls this period — lowest in the team.`,
      metric: `${low.total} calls`,
    });
  }

  // ── INSIGHT 3: Busiest Day ─────────────────
  if (dateData?.length > 0) {
    const busiest = [...dateData].sort((a, b) => b.count - a.count)[0];
    insights.push({
      id:     "busiest-day",
      color:  "blue",
      icon:   "📅",
      title:  `Peak Activity Day`,
      text:   `${busiest.date} was the busiest day with ${busiest.count} interactions from ${busiest.mrCount} MRs.`,
      metric: busiest.date,
    });
  }

  // ── INSIGHT 4: Coaching Rate ───────────────
  const coached = rows.filter(
    (r) => r && String(r.IsMRCoachingSubmitted).trim().toLowerCase() === "true"
  ).length;
  const coachPct = ((coached / total) * 100).toFixed(1);
  const zeroCoach = mrData?.filter((m) => m.coached === 0).length ?? 0;

  insights.push({
    id:     "coaching",
    color:  "purple",
    icon:   "🎓",
    title:  `Coaching Coverage: ${coachPct}%`,
    text:   `${coached} interactions included MR coaching. ${zeroCoach} MR${zeroCoach !== 1 ? "s" : ""} have zero coaching sessions.`,
    metric: `${coachPct}%`,
  });

  // ── INSIGHT 5: Interaction Mix ─────────────
  const hcp  = rows.filter((r) => r && safeStr(r.InteractionType) === "HCP").length;
  const ph   = rows.filter((r) => r && safeStr(r.InteractionType) === "Pharmacy").length;
  const hco  = rows.filter((r) => r && safeStr(r.InteractionType) === "HCO").length;
  const hcpP = ((hcp / total) * 100).toFixed(1);
  const phP  = ((ph  / total) * 100).toFixed(1);
  const hcoP = ((hco / total) * 100).toFixed(1);

  insights.push({
    id:     "interaction-mix",
    color:  "teal",
    icon:   "👥",
    title:  `Interaction Type Mix`,
    text:   `HCP visits: ${hcpP}% · Pharmacy: ${phP}% · HCO: ${hcoP}% of all ${total.toLocaleString()} interactions.`,
    metric: `${hcpP}% HCP`,
  });

  // ── INSIGHT 6: Grade A+/A Coverage ────────
  const highGrade = rows.filter(
    (r) => r && ["A+", "A"].includes(safeStr(r.CustomerGrade))
  ).length;
  const highPct = ((highGrade / total) * 100).toFixed(1);

  insights.push({
    id:     "grade-coverage",
    color:  "yellow",
    icon:   "⭐",
    title:  `High-Value Customer Coverage`,
    text:   `Grade A+ and A customers represent ${highPct}% of all visits — ${highGrade.toLocaleString()} high-value interactions.`,
    metric: `${highPct}%`,
  });

  // ── INSIGHT 7: Active Days ─────────────────
  const activeDays = dateData?.length ?? 0;
  const totalDays  = (() => {
    if (!dateData?.length) return 0;
    const dates   = dateData.map((d) => new Date(d.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    return Math.round(
      (maxDate - minDate) / (1000 * 60 * 60 * 24)
    ) + 1;
  })();

  insights.push({
    id:     "active-days",
    color:  "blue",
    icon:   "📆",
    title:  `Field Coverage: ${activeDays} Active Days`,
    text:   `Team was active on ${activeDays} out of ${totalDays} calendar days in this period.`,
    metric: `${activeDays} days`,
  });

  // ── INSIGHT 8: Unique Customers ────────────
  const uniqueC = new Set(rows.map((r) => r?.CustomerId).filter(Boolean)).size;
  const avgPerC = (total / uniqueC).toFixed(1);

  insights.push({
    id:     "customers",
    color:  "green",
    icon:   "🏥",
    title:  `Customer Reach`,
    text:   `${uniqueC.toLocaleString()} unique customers visited. Average of ${avgPerC} interactions per customer.`,
    metric: `${uniqueC} customers`,
  });

  return insights;
};
