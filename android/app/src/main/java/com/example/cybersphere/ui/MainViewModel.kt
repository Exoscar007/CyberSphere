package com.example.cybersphere.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.cybersphere.data.models.*
import com.example.cybersphere.data.network.ApiClient
import com.example.cybersphere.data.network.MonitoringWebSocketClient
import com.example.cybersphere.data.network.TelemetryState
import com.example.cybersphere.data.repository.CyberSphereRepository
import com.example.cybersphere.data.session.SessionManager
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class MainViewModel(application: Application) : AndroidViewModel(application) {
    val sessionManager = SessionManager(application)
    val apiClient = ApiClient(sessionManager)
    val repository = CyberSphereRepository(apiClient, sessionManager)
    val wsClient = MonitoringWebSocketClient(sessionManager)

    // Auth State
    private val _currentUser = MutableStateFlow<User?>(sessionManager.getUser())
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val _currentRole = MutableStateFlow(sessionManager.getUserRole())
    val currentRole: StateFlow<String> = _currentRole.asStateFlow()

    private val _currentScreen = MutableStateFlow("LOGIN")
    val currentScreen: StateFlow<String> = _currentScreen.asStateFlow()

    // Data States
    private val _incidents = MutableStateFlow<List<Incident>>(emptyList())
    val incidents: StateFlow<List<Incident>> = _incidents.asStateFlow()

    private val _firs = MutableStateFlow<List<FIR>>(emptyList())
    val firs: StateFlow<List<FIR>> = _firs.asStateFlow()

    private val _patrols = MutableStateFlow<List<PatrolAssignment>>(emptyList())
    val patrols: StateFlow<List<PatrolAssignment>> = _patrols.asStateFlow()

    private val _riskScores = MutableStateFlow<List<RiskScore>>(emptyList())
    val riskScores: StateFlow<List<RiskScore>> = _riskScores.asStateFlow()

    private val _temporalTrends = MutableStateFlow<List<TemporalTrend>>(emptyList())
    val temporalTrends: StateFlow<List<TemporalTrend>> = _temporalTrends.asStateFlow()

    private val _complaints = MutableStateFlow<List<Complaint>>(emptyList())
    val complaints: StateFlow<List<Complaint>> = _complaints.asStateFlow()

    private val _operationalHistory = MutableStateFlow<List<OperationalHistoryItem>>(emptyList())
    val operationalHistory: StateFlow<List<OperationalHistoryItem>> = _operationalHistory.asStateFlow()

    private val _systemHealth = MutableStateFlow<SystemHealth?>(null)
    val systemHealth: StateFlow<SystemHealth?> = _systemHealth.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _toastMessage = MutableSharedFlow<String>()
    val toastMessage: SharedFlow<String> = _toastMessage.asSharedFlow()

    val telemetryState: StateFlow<TelemetryState> = wsClient.connectionState

    init {
        if (sessionManager.isLoggedIn()) {
            val user = sessionManager.getUser()
            _currentUser.value = user
            val role = user?.role ?: "POLICE_OFFICER"
            _currentRole.value = role
            _currentScreen.value = getInitialScreenForRole(role)
            loadAllData()
            wsClient.connect()
        }

        // Listen to real-time WebSocket events
        viewModelScope.launch {
            wsClient.incomingEvents.collect { event ->
                when (event.type) {
                    "incident_created", "critical_alert" -> {
                        _toastMessage.emit("🚨 Live Alert: New incident logged")
                        refreshIncidents()
                    }
                    "patrol_location_updated" -> {
                        refreshPatrols()
                    }
                }
            }
        }
    }

    private fun getInitialScreenForRole(role: String): String {
        return when (role) {
            "ADMIN" -> "CITY_OVERVIEW"
            "STATION" -> "STATION_OVERVIEW"
            else -> "OFFICER_WORKSPACE"
        }
    }

    fun navigateTo(screen: String) {
        _currentScreen.value = screen
    }

    fun performLogin(user: User) {
        _currentUser.value = user
        _currentRole.value = user.role
        _currentScreen.value = getInitialScreenForRole(user.role)
        loadAllData()
        wsClient.connect()
    }

    fun performLogout() {
        wsClient.disconnect()
        sessionManager.clearSession()
        _currentUser.value = null
        _currentRole.value = "GUEST"
        _currentScreen.value = "LOGIN"
    }

    fun switchRoleForDemo(role: String) {
        val user = when (role) {
            "ADMIN" -> User(1, "admin", "admin@cybersphere.gov.in", "ADMIN", 1, "City Command HQ", "CS-001", "+91 98000 11111", false)
            "STATION" -> User(2, "station_navrangpura", "navrangpura@cybersphere.gov.in", "STATION", 1, "Navrangpura PS", "CS-102", "+91 98000 22222", false)
            else -> User(3, "officer_vikram", "vikram@cybersphere.gov.in", "POLICE_OFFICER", 1, "Navrangpura PS", "CS-405", "+91 98000 33333", false)
        }
        sessionManager.saveUser(user)
        sessionManager.saveTokens("token-$role", "refresh-$role")
        performLogin(user)
    }

    fun loadAllData() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                _incidents.value = repository.getIncidents()
                _firs.value = repository.getFIRs()
                _patrols.value = repository.getPatrolAssignments()
                _riskScores.value = repository.getRiskScores()
                _temporalTrends.value = repository.getTemporalTrends()
                _complaints.value = repository.getComplaints()
                _operationalHistory.value = repository.getOperationalHistory()
                _systemHealth.value = repository.getSystemHealth()
            } catch (e: Exception) {
                // Keep existing cached data
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun refreshIncidents() {
        viewModelScope.launch {
            _incidents.value = repository.getIncidents()
        }
    }

    fun refreshPatrols() {
        viewModelScope.launch {
            _patrols.value = repository.getPatrolAssignments()
        }
    }

    fun createIncident(
        title: String,
        type: String,
        severity: String,
        lat: Double,
        lng: Double,
        locationName: String,
        description: String
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            val stationId = _currentUser.value?.station_id ?: 1
            repository.createIncident(title, type, severity, lat, lng, stationId, locationName, description)
            _incidents.value = repository.getIncidents()
            _toastMessage.emit("Incident logged successfully")
            _isLoading.value = false
        }
    }

    fun updateIncidentStatus(id: Int, newStatus: String) {
        viewModelScope.launch {
            repository.updateIncidentStatus(id, newStatus)
            _incidents.value = repository.getIncidents()
            _toastMessage.emit("Incident status updated to $newStatus")
        }
    }

    fun createFIR(
        complainant: String,
        contact: String,
        accused: String,
        type: String,
        ipc: List<String>,
        lat: Double,
        lng: Double,
        locationName: String,
        description: String
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            val stationId = _currentUser.value?.station_id ?: 1
            repository.createFIR(complainant, contact, accused, type, ipc, lat, lng, locationName, stationId, description)
            _firs.value = repository.getFIRs()
            _toastMessage.emit("FIR Registered Successfully")
            _isLoading.value = false
        }
    }

    fun sendPatrolPing(assignmentId: Int) {
        viewModelScope.launch {
            val curr = _patrols.value.firstOrNull { it.id == assignmentId }
            val newLat = (curr?.latitude ?: 23.0365) + ((1..5).random() * 0.001)
            val newLng = (curr?.longitude ?: 72.5611) + ((1..5).random() * 0.001)
            repository.sendPatrolPing(assignmentId, newLat, newLng)
            _patrols.value = repository.getPatrolAssignments()
            _toastMessage.emit("GPS Telemetry Ping Broadcasted")
        }
    }

    fun triggerAiRetrain(onComplete: (AiJobStatus) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.triggerAiRetrain()
            _riskScores.value = repository.getRiskScores()
            _toastMessage.emit(result.message)
            _isLoading.value = false
            onComplete(result)
        }
    }
}
