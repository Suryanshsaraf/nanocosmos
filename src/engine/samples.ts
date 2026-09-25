import type { CosmosDocument } from './types.ts';

export const SAMPLE_DOCUMENTS: CosmosDocument[] = [
  {
    id: "customer_001",
    customerType: "individual",
    profile: {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1-555-0123",
      preferredContact: "email"
    },
    businessInfo: {
      industry: "Healthcare",
      jobTitle: "Chief Medical Officer",
      company: "Regional Medical Center"
    },
    preferences: {
      communicationFrequency: "monthly",
      serviceInterests: ["strategic consulting", "digital transformation"],
      language: "en-US",
      timezone: "America/New_York"
    },
    relationshipData: {
      acquisitionDate: "2023-06-15",
      primaryConsultant: "consultant_789",
      relationshipManager: "manager_456",
      engagementScore: 85,
      lastContactDate: "2024-01-10"
    },
    projectHistory: [
      {
        projectId: "proj_001",
        projectName: "Digital Health Strategy",
        startDate: "2023-08-01",
        status: "completed",
        value: 75000
      }
    ]
  },
  {
    id: "customer_002",
    customerType: "small_business",
    profile: {
      firstName: "David",
      lastName: "Miller",
      email: "david.m@miller-logistics.com",
      phone: "+1-555-0199",
      preferredContact: "phone"
    },
    businessInfo: {
      industry: "Logistics",
      jobTitle: "Managing Director",
      company: "Miller Freight Solutions"
    },
    preferences: {
      communicationFrequency: "weekly",
      serviceInterests: ["supply chain optimization", "cloud migration"],
      language: "en-US",
      timezone: "America/Chicago"
    },
    relationshipData: {
      acquisitionDate: "2022-11-20",
      primaryConsultant: "consultant_102",
      relationshipManager: "manager_456",
      engagementScore: 78,
      lastContactDate: "2023-12-18"
    },
    projectHistory: [
      {
        projectId: "proj_002",
        projectName: "Route Optimization Engine",
        startDate: "2023-02-15",
        status: "completed",
        value: 120000
      }
    ]
  },
  {
    id: "customer_003",
    customerType: "enterprise",
    profile: {
      firstName: "Elena",
      lastName: "Rostova",
      email: "e.rostova@globalkapital.org",
      phone: "+44-20-7946-0912",
      preferredContact: "email"
    },
    businessInfo: {
      industry: "Financial Services",
      jobTitle: "VP of Enterprise Architecture",
      company: "Global Kapital Group"
    },
    preferences: {
      communicationFrequency: "bi-weekly",
      serviceInterests: ["regulatory compliance", "strategic consulting", "ai ops"],
      language: "en-GB",
      timezone: "Europe/London"
    },
    relationshipData: {
      acquisitionDate: "2021-04-10",
      primaryConsultant: "consultant_550",
      relationshipManager: "manager_901",
      engagementScore: 92,
      lastContactDate: "2024-02-01"
    },
    projectHistory: [
      {
        projectId: "proj_003",
        projectName: "Core Banking Modernization",
        startDate: "2022-01-10",
        status: "active",
        value: 850000
      }
    ]
  }
];

export const PRESET_QUERIES = [
  {
    id: "lookup-point",
    name: "1. Partition-Aware Point Lookup (customer_001)",
    description: "Point read targeting single partition key ('individual') and id ('customer_001'). Lowest RU and latency.",
    sql: `SELECT * FROM c
WHERE c.id = "customer_001"
AND c.customerType = "individual"`
  },
  {
    id: "filter-single-partition",
    name: "2. Partition-Aware Array Filter (Individual Service Interests)",
    description: "Filters array index inside a single partition ('individual').",
    sql: `SELECT * FROM c
WHERE c.customerType = "individual"
AND c.preferences.serviceInterests[0] = "strategic consulting"`
  },
  {
    id: "high-value-enterprise",
    name: "3. Enterprise High-Engagement Filter",
    description: "Queries enterprise partition with engagementScore > 80 filter.",
    sql: `SELECT * FROM c
WHERE c.customerType = "enterprise"
AND c.relationshipData.engagementScore > 80`
  },
  {
    id: "cross-partition-group",
    name: "4. Cross-Partition Aggregation (GROUP BY customerType)",
    description: "Cross-partition aggregation across all physical partitions. Generates fanout and client merge overhead.",
    sql: `SELECT c.customerType,
       COUNT(1) AS customerCount,
       AVG(c.relationshipData.engagementScore) AS avgEngagement
FROM c
GROUP BY c.customerType`
  },
  {
    id: "cross-partition-date",
    name: "5. Cross-Partition Date Range Scan",
    description: "Scans all partitions to find customers due for contact before 2024.",
    sql: `SELECT c.id,
       c.profile.firstName,
       c.profile.lastName,
       c.relationshipData.lastContactDate
FROM c
WHERE c.relationshipData.lastContactDate < "2024-01-01"`
  }
];
