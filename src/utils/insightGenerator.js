import { safeStr } from "./safeCSV";
import { safeParseDate } from "./dateHelpers";

export const generateInsights = (rows, targets) => {
  const insights = [];
  if (!rows?.length) return insights;

  const total = rows.length;
  
  const mrDataMap = {};
  const dateDataMap = {};
  const uniqueCust = new Set();
  
  rows.forEach(r => {
    const mr = safeStr(r.MrName);
    const date = safeStr(r.ReportDate);
    const type = safeStr(r.InteractionType);
    const grade = safeStr(r.CustomerGrade);
    const isCoached = safeStr(r.IsMRCoachingSubmitted) === 'True';
    const cid = safeStr(r.CustomerId) || safeStr(r.CustomerName);
    
    if (cid) uniqueCust.add(cid);

    if (mr) {
      if (!mrDataMap[mr]) mrDataMap[mr] = { name: mr, total: 0, hcp: 0, hco: 0, ph: 0, coached: 0, dates: new Set() };
      mrDataMap[mr].total++;
      if (type === 'HCP') mrDataMap[mr].hcp++;
      if (isCoached) mrDataMap[mr].coached++;
      if (date) mrDataMap[mr].dates.add(date);
    }
    
    if (date) {
      if (!dateDataMap[date]) dateDataMap[date] = { date, count: 0, mrs: new Set() };
      dateDataMap[date].count++;
      if (mr) dateDataMap[date].mrs.add(mr);
    }
  });

  const mrArray = Object.values(mrDataMap).sort((a,b) => b.total - a.total);
  const dateArray = Object.values(dateDataMap).sort((a,b) => b.count - a.count);

  const avgTeamCalls = mrArray.length > 0 ? (total / mrArray.length).toFixed(0) : 0;

  // 1. TOP PERFORMER
  if (mrArray.length > 0) {
    const top = mrArray[0];
    const aboveAvg = (((top.total - avgTeamCalls)/avgTeamCalls)*100).toFixed(0);
    insights.push({ id: 1, color: "border-l-green-500", icon: "🏆", title: "TOP PERFORMER", text: `${top.name} leads with ${top.total} calls — ${aboveAvg}% above team average of ${avgTeamCalls}`, metric: `${top.total}` });
  }

  // 2. NEEDS ATTENTION
  if (mrArray.length > 1) {
    const low = mrArray[mrArray.length - 1];
    insights.push({ id: 2, color: "border-l-red-500", icon: "⚠️", title: "NEEDS ATTENTION", text: `${low.name} recorded only ${low.total} calls — lowest in team. Requires follow-up.`, metric: `${low.total}` });
  }

  // 3. BUSIEST DAY
  if (dateArray.length > 0) {
    const busiest = dateArray[0];
    insights.push({ id: 3, color: "border-l-blue-500", icon: "📅", title: "BUSIEST DAY", text: `${busiest.date} was peak activity with ${busiest.count} interactions from ${busiest.mrs.size} MRs`, metric: `${busiest.count}` });
  }

  // 4. COACHING ALERT
  const zeroCoachCount = mrArray.filter(m => m.coached === 0).length;
  const coachedRows = rows.filter(r => safeStr(r.IsMRCoachingSubmitted) === 'True').length;
  const teamCoachPct = ((coachedRows/total)*100).toFixed(1);
  insights.push({ id: 4, color: "border-l-purple-500", icon: "🎓", title: "COACHING ALERT", text: `${zeroCoachCount} MRs have ZERO coaching sessions. Team coaching rate: ${teamCoachPct}%`, metric: `${teamCoachPct}%` });

  // 5. CUSTOMER MIX
  const hcpCount = rows.filter(r => safeStr(r.InteractionType) === 'HCP').length;
  const hcoCount = rows.filter(r => safeStr(r.InteractionType) === 'HCO').length;
  const phCount = rows.filter(r => safeStr(r.InteractionType) === 'Pharmacy').length;
  insights.push({ id: 5, color: "border-l-teal-500", icon: "👥", title: "CUSTOMER MIX", text: `HCP: ${((hcpCount/total)*100).toFixed(1)}% · HCO: ${((hcoCount/total)*100).toFixed(1)}% · PH: ${((phCount/total)*100).toFixed(1)}% of ${total} total interactions`, metric: `${hcpCount} HCP` });

  // 6. HIGH VALUE COVERAGE
  const highValue = rows.filter(r => ['A+', 'A'].includes(safeStr(r.CustomerGrade))).length;
  insights.push({ id: 6, color: "border-l-yellow-500", icon: "⭐", title: "HIGH VALUE COVERAGE", text: `Grade A+ and A customers = ${((highValue/total)*100).toFixed(1)}% of all visits (${highValue} interactions)`, metric: `${((highValue/total)*100).toFixed(1)}%` });

  // 7. FIELD COVERAGE
  if (dateArray.length > 0) {
    const minD = safeParseDate(dateArray.reduce((min, d) => d.date < min ? d.date : min, dateArray[0].date));
    const maxD = safeParseDate(dateArray.reduce((max, d) => d.date > max ? d.date : max, dateArray[0].date));
    
    let calendarDays = 1;
    if (minD && maxD) {
      calendarDays = Math.round((maxD - minD) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    const activeDays = dateArray.length;
    const callsPerActive = (total / activeDays).toFixed(1);
    insights.push({ id: 7, color: "border-l-blue-500", icon: "📆", title: "FIELD COVERAGE", text: `Team active ${activeDays} of ${calendarDays || 1} calendar days. Average ${callsPerActive} calls per active day.`, metric: `${activeDays}/${calendarDays}` });
  }

  // 8. UNIQUE CUSTOMERS
  const uq = uniqueCust.size;
  const avgV = uq > 0 ? (total / uq).toFixed(1) : 0;
  insights.push({ id: 8, color: "border-l-green-500", icon: "🏥", title: "UNIQUE CUSTOMERS", text: `${uq} unique customers visited. Average ${avgV} visits per customer.`, metric: `${uq}` });

  // 9. BELOW TARGET ALERT
  if (targets && targets.hcpPerDay > 0) {
    const below70 = mrArray.filter(m => {
       const hcpRate = m.dates.size > 0 ? (m.hcp / m.dates.size) : 0;
       return (hcpRate / targets.hcpPerDay) < 0.70;
    }).length;
    insights.push({ id: 9, color: "border-l-red-500", icon: "🔴", title: "BELOW TARGET ALERT", text: `${below70} MRs are below 70% of HCP target. Immediate coaching recommended.`, metric: `${below70} MRs` });
  }

  // 10. CALL RATE INSIGHT
  const mrWithRates = mrArray.map(m => {
    const rate = m.dates.size > 0 ? (m.hcp / m.dates.size) : 0;
    return { name: m.name, rate };
  }).sort((a,b) => b.rate - a.rate);
  
  if (mrWithRates.length > 0) {
    const best = mrWithRates[0];
    const teamAvg = (mrWithRates.reduce((s, m) => s + m.rate, 0) / mrWithRates.length).toFixed(1);
    insights.push({ id: 10, color: "border-l-indigo-500", icon: "📊", title: "CALL RATE INSIGHT", text: `Best HCP rate: ${best.name} at ${best.rate.toFixed(1)}/day. Team average: ${teamAvg} calls/day.`, metric: `${best.rate.toFixed(1)}` });
  }

  return insights;
};
