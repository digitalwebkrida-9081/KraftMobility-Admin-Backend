const Case = require("../models/case.model");
const User = require("../models/user.model");

/**
 * Case Analytics Controller
 * Returns role-specific analytics data for the Case Management dashboard.
 */
exports.getCaseAnalytics = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    // Build query based on role
    let query = {};
    if (userRole === "HR") {
      query.createdBy = userId;
    } else if (userRole === "Case Manager") {
      query.assignedCaseManager = userId;
    }
    // Admin sees all

    const cases = await Case.find(query)
      .populate("createdBy", "username email role")
      .populate("assignedCaseManager", "username email role")
      .populate("assignedFieldExecutive", "username email role")
      .lean();

    const now = new Date();

    // ─── 1. STATUS DISTRIBUTION ───
    const statusCounts = { Initiated: 0, "In Progress": 0, Completed: 0, Cancelled: 0 };
    cases.forEach((c) => {
      if (statusCounts[c.status] !== undefined) statusCounts[c.status]++;
    });

    // ─── 2. SERVICES USAGE BREAKDOWN ───
    const serviceKeys = [
      "homeSearch",
      "personalLease",
      "corporateLease",
      "orientationProgram",
      "householdGoodsMovement",
      "schoolSearch",
      "simCardConnection",
      "tenancyManagement",
      "visaApplication",
      "departure",
      "aadharCard",
      "cForm",
      "other",
    ];
    const serviceLabels = {
      homeSearch: "Home Search",
      personalLease: "Personal Lease",
      corporateLease: "Corporate Lease",
      orientationProgram: "Orientation Program",
      householdGoodsMovement: "Household Goods Movement",
      schoolSearch: "School Search",
      simCardConnection: "SIM Card Connection",
      tenancyManagement: "Tenancy Management",
      visaApplication: "Visa Application",
      departure: "Departure",
      aadharCard: "Aadhar Card",
      cForm: "C-Form",
      other: "Other",
    };
    const servicesUsage = {};
    serviceKeys.forEach((key) => {
      servicesUsage[key] = 0;
    });
    cases.forEach((c) => {
      const sa = c.servicesAuthorized || {};
      serviceKeys.forEach((key) => {
        if (sa[key]) servicesUsage[key]++;
      });
    });
    const servicesBreakdown = serviceKeys
      .map((key) => ({
        key,
        label: serviceLabels[key],
        count: servicesUsage[key],
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);

    // ─── 3. RELOCATION TYPE SPLIT ───
    const relocationSplit = { Domestic: 0, International: 0, Unspecified: 0 };
    cases.forEach((c) => {
      if (c.relocationType === "Domestic") relocationSplit.Domestic++;
      else if (c.relocationType === "International") relocationSplit.International++;
      else relocationSplit.Unspecified++;
    });

    // ─── 4. UNASSIGNED CASES ───
    const unassignedCount = cases.filter((c) => !c.assignedCaseManager && c.status !== "Cancelled" && c.status !== "Completed").length;

    // ─── 5. AVERAGE CASE COMPLETION TIME ───
    const completedCases = cases.filter((c) => c.status === "Completed");
    let avgCompletionDays = 0;
    if (completedCases.length > 0) {
      const totalDays = completedCases.reduce((sum, c) => {
        const created = new Date(c.createdAt);
        const updated = new Date(c.updatedAt);
        return sum + (updated - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgCompletionDays = Math.round(totalDays / completedCases.length);
    }

    // ─── 6. CITY/LOCATION DISTRIBUTION ───
    const cityMap = {};
    cases.forEach((c) => {
      const city = c.city || "Unknown";
      cityMap[city] = (cityMap[city] || 0) + 1;
    });
    const cityDistribution = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    // ─── ALL EXPIRIES BY SERVICE ───
    const serviceExpiries = [];

    // ─── 7. SERVICE DATES TRACKING (CRITICAL) ───
    // Extract all service start/end dates across all cases
    const serviceTrackingEntries = [];
    const upcomingDeadlines = [];
    const overdueItems = [];
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    cases.forEach((c) => {
      const st = c.serviceTracking || {};
      const caseInfo = {
        caseId: c._id,
        assigneeName: c.assigneeName,
        empNumber: c.empNumber || "N/A",
        billingEntity: c.billingEntity || "N/A",
        caseManagerName: c.assignedCaseManager?.username || "Unassigned",
        hrName: c.createdBy?.username || "Unknown",
        status: c.status,
        createdAt: c.createdAt,
      };

      // Home Search
      if (st.homeSearch) {
        const hs = st.homeSearch;
        if (hs.startDate || hs.endDate) {
          serviceTrackingEntries.push({
            ...caseInfo,
            service: "Home Search",
            startDate: hs.startDate || null,
            endDate: hs.endDate || null,
            details: hs.propertyAddress ? `Property: ${hs.propertyAddress}` : null,
          });
        }
        if (hs.leaseEndDate) {
          serviceExpiries.push({
            ...caseInfo,
            service: "Home Search",
            expiryDate: hs.leaseEndDate,
            expiryType: "Lease End Date",
            serviceStartDate: hs.leaseStartDate || hs.startDate || null
          });
          const leaseEnd = new Date(hs.leaseEndDate);
          if (leaseEnd > now && leaseEnd <= thirtyDaysFromNow) {
            upcomingDeadlines.push({
              ...caseInfo,
              service: "Home Search",
              deadline: hs.leaseEndDate,
              deadlineType: "Lease End Date",
              daysRemaining: Math.ceil((leaseEnd - now) / (1000 * 60 * 60 * 24)),
            });
          }
          if (leaseEnd < now && c.status !== "Completed" && c.status !== "Cancelled") {
            overdueItems.push({
              ...caseInfo,
              service: "Home Search",
              deadline: hs.leaseEndDate,
              deadlineType: "Lease End Date",
              overdueDays: Math.ceil((now - leaseEnd) / (1000 * 60 * 60 * 24)),
            });
          }
        }
      }

      // Orientation
      if (st.orientation && (st.orientation.startDate || st.orientation.endDate)) {
        serviceTrackingEntries.push({
          ...caseInfo,
          service: "Orientation",
          startDate: st.orientation.startDate || null,
          endDate: st.orientation.endDate || null,
        });
      }

      // School Search
      if (st.schoolSearch && (st.schoolSearch.startDate || st.schoolSearch.endDate)) {
        serviceTrackingEntries.push({
          ...caseInfo,
          service: "School Search",
          startDate: st.schoolSearch.startDate || null,
          endDate: st.schoolSearch.endDate || null,
          details: st.schoolSearch.schoolName ? `School: ${st.schoolSearch.schoolName}` : null,
        });
      }

      // Visa
      if (st.visa) {
        const visa = st.visa;
        if (visa.startDate || visa.endDate) {
          serviceTrackingEntries.push({
            ...caseInfo,
            service: "Visa",
            startDate: visa.startDate || null,
            endDate: visa.endDate || null,
            details: visa.type ? `Type: ${visa.type}` : null,
          });
        }
        // FRRO tracking
        if (visa.frroStartDate || visa.frroEndDate) {
          serviceTrackingEntries.push({
            ...caseInfo,
            service: "FRRO",
            startDate: visa.frroStartDate || null,
            endDate: visa.frroEndDate || null,
          });
        }
        // Visa end date deadline
        if (visa.endDate) {
          serviceExpiries.push({
            ...caseInfo,
            service: "Visa",
            expiryDate: visa.endDate,
            expiryType: "Visa Expiry",
            serviceStartDate: visa.startDate || null
          });
          const visaEnd = new Date(visa.endDate);
          if (visaEnd > now && visaEnd <= thirtyDaysFromNow) {
            upcomingDeadlines.push({
              ...caseInfo,
              service: "Visa",
              deadline: visa.endDate,
              deadlineType: "Visa Expiry",
              daysRemaining: Math.ceil((visaEnd - now) / (1000 * 60 * 60 * 24)),
            });
          }
          if (visaEnd < now && c.status !== "Completed" && c.status !== "Cancelled") {
            overdueItems.push({
              ...caseInfo,
              service: "Visa",
              deadline: visa.endDate,
              deadlineType: "Visa Expired",
              overdueDays: Math.ceil((now - visaEnd) / (1000 * 60 * 60 * 24)),
            });
          }
        }
        // FRRO deadline
        if (visa.frroEndDate) {
          serviceExpiries.push({
            ...caseInfo,
            service: "Visa",
            expiryDate: visa.frroEndDate,
            expiryType: "FRRO Expiry",
            serviceStartDate: visa.frroStartDate || null
          });
          const frroEnd = new Date(visa.frroEndDate);
          if (frroEnd > now && frroEnd <= thirtyDaysFromNow) {
            upcomingDeadlines.push({
              ...caseInfo,
              service: "FRRO",
              deadline: visa.frroEndDate,
              deadlineType: "FRRO Expiry",
              daysRemaining: Math.ceil((frroEnd - now) / (1000 * 60 * 60 * 24)),
            });
          }
          if (frroEnd < now && c.status !== "Completed" && c.status !== "Cancelled") {
            overdueItems.push({
              ...caseInfo,
              service: "FRRO",
              deadline: visa.frroEndDate,
              deadlineType: "FRRO Expired",
              overdueDays: Math.ceil((now - frroEnd) / (1000 * 60 * 60 * 24)),
            });
          }
        }
      }

      // Tenancy Management
      if (st.tenancyManagement && (st.tenancyManagement.startDate || st.tenancyManagement.endDate)) {
        serviceTrackingEntries.push({
          ...caseInfo,
          service: "Tenancy Management",
          startDate: st.tenancyManagement.startDate || null,
          endDate: st.tenancyManagement.endDate || null,
        });
        if (st.tenancyManagement.endDate) {
          serviceExpiries.push({
            ...caseInfo,
            service: "Tenancy Management",
            expiryDate: st.tenancyManagement.endDate,
            expiryType: "Tenancy End Date",
            serviceStartDate: st.tenancyManagement.startDate || null
          });
          const tmEnd = new Date(st.tenancyManagement.endDate);
          if (tmEnd > now && tmEnd <= thirtyDaysFromNow) {
            upcomingDeadlines.push({
              ...caseInfo,
              service: "Tenancy Management",
              deadline: st.tenancyManagement.endDate,
              deadlineType: "Tenancy End Date",
              daysRemaining: Math.ceil((tmEnd - now) / (1000 * 60 * 60 * 24)),
            });
          }
        }
      }

      // Aadhar Card
      if (st.aadharCard && st.aadharCard.expiryDate) {
        serviceExpiries.push({
          ...caseInfo,
          service: "Aadhar Card",
          expiryDate: st.aadharCard.expiryDate,
          expiryType: "Aadhar Expiry",
          serviceStartDate: null // Aadhar doesn't have a start date in schema
        });
        const aadharExpiry = new Date(st.aadharCard.expiryDate);
        serviceTrackingEntries.push({
          ...caseInfo,
          service: "Aadhar Card",
          startDate: null,
          endDate: st.aadharCard.expiryDate,
        });
        if (aadharExpiry > now && aadharExpiry <= thirtyDaysFromNow) {
          upcomingDeadlines.push({
            ...caseInfo,
            service: "Aadhar Card",
            deadline: st.aadharCard.expiryDate,
            deadlineType: "Aadhar Expiry",
            daysRemaining: Math.ceil((aadharExpiry - now) / (1000 * 60 * 60 * 24)),
          });
        }
        if (aadharExpiry < now && c.status !== "Completed" && c.status !== "Cancelled") {
          overdueItems.push({
            ...caseInfo,
            service: "Aadhar Card",
            deadline: st.aadharCard.expiryDate,
            deadlineType: "Aadhar Expired",
            overdueDays: Math.ceil((now - aadharExpiry) / (1000 * 60 * 60 * 24)),
          });
        }
      }

      // Departure
      if (st.departure && st.departure.propertyClosureDate) {
        serviceExpiries.push({
          ...caseInfo,
          service: "Departure",
          expiryDate: st.departure.propertyClosureDate,
          expiryType: "Property Closure",
          serviceStartDate: null // Departure doesn't have a start date in schema
        });
        const closureDate = new Date(st.departure.propertyClosureDate);
        serviceTrackingEntries.push({
          ...caseInfo,
          service: "Departure",
          startDate: null,
          endDate: st.departure.propertyClosureDate,
        });
        if (closureDate > now && closureDate <= thirtyDaysFromNow) {
          upcomingDeadlines.push({
            ...caseInfo,
            service: "Departure",
            deadline: st.departure.propertyClosureDate,
            deadlineType: "Property Closure",
            daysRemaining: Math.ceil((closureDate - now) / (1000 * 60 * 60 * 24)),
          });
        }
      }
    });

    // Sort deadlines by urgency
    upcomingDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
    overdueItems.sort((a, b) => b.overdueDays - a.overdueDays);

    // ─── 8. CASE MANAGER WORKLOAD (Admin only) ───
    let caseManagerWorkload = [];
    if (userRole === "Admin" || userRole === "Super Admin") {
      const workloadMap = {};
      cases.forEach((c) => {
        if (c.assignedCaseManager) {
          const managerId = c.assignedCaseManager._id || c.assignedCaseManager;
          const managerName = c.assignedCaseManager.username || "Unknown";
          if (!workloadMap[managerId]) {
            workloadMap[managerId] = {
              managerId,
              managerName,
              total: 0,
              initiated: 0,
              inProgress: 0,
              completed: 0,
              cancelled: 0,
            };
          }
          workloadMap[managerId].total++;
          if (c.status === "Initiated") workloadMap[managerId].initiated++;
          else if (c.status === "In Progress") workloadMap[managerId].inProgress++;
          else if (c.status === "Completed") workloadMap[managerId].completed++;
          else if (c.status === "Cancelled") workloadMap[managerId].cancelled++;
        }
      });
      caseManagerWorkload = Object.values(workloadMap).sort((a, b) => b.total - a.total);
    }

    // ─── 9. HR INITIATION STATS (Admin only) ───
    let hrInitiationStats = [];
    if (userRole === "Admin" || userRole === "Super Admin") {
      const hrMap = {};
      cases.forEach((c) => {
        if (c.createdBy) {
          const hrId = c.createdBy._id || c.createdBy;
          const hrName = c.createdBy.username || "Unknown";
          const hrRole = c.createdBy.role || "Unknown";
          if (!hrMap[hrId]) {
            hrMap[hrId] = { hrId, hrName, hrRole, total: 0 };
          }
          hrMap[hrId].total++;
        }
      });
      hrInitiationStats = Object.values(hrMap).sort((a, b) => b.total - a.total);
    }

    // ─── 10. MONTHLY TREND (last 12 months) ───
    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const monthCases = cases.filter((c) => {
        const created = new Date(c.createdAt);
        return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
      });
      monthlyTrend.push({
        month: monthStr,
        count: monthCases.length,
        completed: monthCases.filter((c) => c.status === "Completed").length,
      });
    }

    // ─── 11. ACTIVE SERVICES SUMMARY ───
    // For each trackable service, count how many active cases have it authorized
    const trackableServices = [
      "homeSearch",
      "orientationProgram",
      "schoolSearch",
      "visaApplication",
      "tenancyManagement",
      "departure",
      "aadharCard",
    ];
    const trackableServiceLabels = {
      homeSearch: "Home Search",
      orientationProgram: "Orientation",
      schoolSearch: "School Search",
      visaApplication: "Visa",
      tenancyManagement: "Tenancy Management",
      departure: "Departure",
      aadharCard: "Aadhar Card",
    };
    const activeCases = cases.filter((c) => c.status === "In Progress" || c.status === "Initiated");
    const activeServicesProgress = trackableServices.map((key) => {
      const authKey = key;
      const trackKey = key === "orientationProgram" ? "orientation" : key === "visaApplication" ? "visa" : key;
      const authorized = cases.filter((c) => c.servicesAuthorized?.[authKey]).length;
      const withStartDate = cases.filter(
        (c) => c.servicesAuthorized?.[authKey] && c.serviceTracking?.[trackKey]?.startDate
      ).length;
      const withEndDate = cases.filter(
        (c) => c.servicesAuthorized?.[authKey] && c.serviceTracking?.[trackKey]?.endDate
      ).length;
      return {
        key,
        label: trackableServiceLabels[key],
        authorized,
        started: withStartDate,
        completed: withEndDate,
      };
    }).filter((s) => s.authorized > 0);

    // ─── 12. DOCUMENTS STATS ───
    let totalDocuments = 0;
    cases.forEach((c) => {
      totalDocuments += (c.documents || []).length;
    });

    // ─── RESPONSE ───
    const response = {
      role: userRole,
      summary: {
        totalCases: cases.length,
        statusCounts,
        unassignedCount,
        avgCompletionDays,
        totalDocuments,
        activeCasesCount: activeCases.length,
        completedCasesCount: completedCases.length,
      },
      servicesBreakdown,
      relocationSplit,
      cityDistribution,
      monthlyTrend,
      serviceTrackingEntries,
      upcomingDeadlines,
      overdueItems,
      activeServicesProgress,
      serviceExpiries,
    };

    // Admin-specific extras
    if (userRole === "Admin" || userRole === "Super Admin") {
      response.caseManagerWorkload = caseManagerWorkload;
      response.hrInitiationStats = hrInitiationStats;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching case analytics:", error);
    res.status(500).json({ message: "Error fetching case analytics", error: error.message });
  }
};
