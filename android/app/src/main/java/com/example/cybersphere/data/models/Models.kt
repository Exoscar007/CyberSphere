package com.example.cybersphere.data.models

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: Int = 0,
    val username: String = "",
    val email: String = "",
    val role: String = "POLICE_OFFICER", // ADMIN, STATION, POLICE_OFFICER, OFFICER
    val station_id: Int? = null,
    val station_name: String? = null,
    val badge_number: String? = null,
    val phone_number: String? = null,
    val mfa_enabled: Boolean = false
)

@Serializable
data class AuthResponse(
    val access: String? = null,
    val refresh: String? = null,
    val user: User? = null,
    val mfa_required: Boolean = false,
    val session_token: String? = null,
    val error: String? = null
)

@Serializable
data class Incident(
    val id: Int = 0,
    val title: String = "",
    val description: String = "",
    val incident_type: String = "THEFT",
    val severity: String = "MEDIUM", // LOW, MEDIUM, HIGH, CRITICAL
    val status: String = "REPORTED", // REPORTED, VERIFIED, IN_PROGRESS, RESOLVED, CLOSED
    val latitude: Double = 23.0225,
    val longitude: Double = 72.5714,
    val location_name: String = "Ahmedabad Central",
    val police_station: Int? = null,
    val police_station_name: String? = null,
    val reported_at: String? = null,
    val created_at: String? = null,
    val assigned_officer_name: String? = null
)

@Serializable
data class FIR(
    val id: Int = 0,
    val fir_number: String = "",
    val incident: Int? = null,
    val incident_title: String? = null,
    val incident_type: String = "THEFT",
    val complainant_name: String = "",
    val complainant_contact: String = "",
    val accused_name: String = "",
    val description: String = "",
    val ipc_sections: List<String> = emptyList(),
    val latitude: Double = 23.0225,
    val longitude: Double = 72.5714,
    val location_name: String = "",
    val police_station: Int? = null,
    val police_station_name: String? = null,
    val status: String = "REGISTERED", // REGISTERED, INVESTIGATION, CHARGESHEET, CLOSED
    val created_at: String? = null
)

@Serializable
data class Complaint(
    val id: Int = 0,
    val complainant_name: String = "",
    val contact_number: String = "",
    val email: String = "",
    val incident_type: String = "THEFT",
    val description: String = "",
    val police_station: Int? = null,
    val police_station_name: String? = null,
    val status: String = "PENDING", // PENDING, REVIEWED, CONVERTED_TO_FIR, REJECTED
    val created_at: String? = null
)

@Serializable
data class Evidence(
    val id: Int = 0,
    val incident: Int = 0,
    val incident_title: String? = null,
    val title: String = "",
    val description: String = "",
    val evidence_type: String = "PHOTO", // PHOTO, VIDEO, AUDIO, DOCUMENT, FORENSIC
    val file_url: String? = null,
    val file_name: String = "",
    val file_size: String = "1.2 MB",
    val collected_by_name: String = "Officer In-Charge",
    val collected_at: String = "",
    val chain_of_custody: List<String> = emptyList()
)

@Serializable
data class PatrolLocation(
    val id: Int = 0,
    val latitude: Double = 23.0225,
    val longitude: Double = 72.5714,
    val speed: Double = 35.0,
    val timestamp: String? = null
)

@Serializable
data class PatrolAssignment(
    val id: Int = 0,
    val officer_id: Int = 0,
    val officer_name: String = "",
    val badge_number: String = "",
    val zone_name: String = "Sector 1 - Navrangpura",
    val latitude: Double = 23.0365,
    val longitude: Double = 72.5611,
    val status: String = "ACTIVE", // ACTIVE, COMPLETED, STANDBY
    val assigned_at: String? = null,
    val last_ping_at: String? = null,
    val locations: List<PatrolLocation> = emptyList()
)

@Serializable
data class RiskScore(
    val zone_id: Int = 0,
    val zone_name: String = "",
    val risk_score: Double = 0.75, // 0.0 to 1.0
    val risk_level: String = "HIGH", // HIGH, MEDIUM, LOW
    val historical_crimes_count: Int = 0,
    val predicted_incident_type: String = "THEFT",
    val latitude: Double = 23.0225,
    val longitude: Double = 72.5714
)

@Serializable
data class TemporalTrend(
    val day_of_week: String = "Monday",
    val hour_bucket: String = "18:00 - 22:00",
    val incident_count: Int = 14,
    val risk_index: Double = 0.82
)

@Serializable
data class AiJobStatus(
    val job_id: String = "",
    val status: String = "SUCCESS", // PENDING, PROCESSING, SUCCESS, FAILED
    val progress: Int = 100,
    val accuracy: Double = 0.89,
    val message: String = "Model retrained with latest 30-day PostGIS spatial clusters"
)

@Serializable
data class SystemHealth(
    val status: String = "UP",
    val database: String = "OK",
    val timestamp: String = "",
    val active_sessions: Int = 4,
    val api_latency_ms: Int = 42
)

@Serializable
data class OperationalHistoryItem(
    val id: Int = 0,
    val title: String = "",
    val incident_type: String = "THEFT",
    val severity: String = "MEDIUM",
    val status: String = "CLOSED",
    val location_name: String = "Navrangpura Market",
    val resolution_summary: String = "Suspect identified via CCTV; recovered assets returned to complainant.",
    val officer_name: String = "Insp. R. Sharma",
    val station_name: String = "Navrangpura PS",
    val closed_at: String = "2026-08-15 17:30",
    val evidence_count: Int = 3
)
