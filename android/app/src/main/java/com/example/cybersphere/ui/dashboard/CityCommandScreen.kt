package com.example.cybersphere.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.cybersphere.data.models.Incident
import com.example.cybersphere.theme.*
import com.example.cybersphere.ui.MainViewModel
import com.example.cybersphere.ui.components.*

@Composable
fun CityCommandScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val incidents by viewModel.incidents.collectAsState()
    val patrols by viewModel.patrols.collectAsState()
    val riskScores by viewModel.riskScores.collectAsState()
    val telemetryState by viewModel.telemetryState.collectAsState()

    var selectedSeverityFilter by remember { mutableStateOf("ALL") }
    var selectedIncidentForModal by remember { mutableStateOf<Incident?>(null) }

    val filteredIncidents = remember(incidents, selectedSeverityFilter) {
        if (selectedSeverityFilter == "ALL") incidents
        else incidents.filter { it.severity.equals(selectedSeverityFilter, ignoreCase = true) }
    }

    val criticalCount = remember(incidents) { incidents.count { it.severity == "CRITICAL" } }
    val activePatrolsCount = remember(patrols) { patrols.count { it.status == "ACTIVE" } }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(CanvasAlabaster)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))
            // Header with Telemetry Pill
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "CITY COMMAND OVERVIEW",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = CoastalBlue,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = "Ahmedabad Municipal Command & Control",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }
                TelemetryHudPill(state = telemetryState)
            }
        }

        // Global KPI Stats Grid
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCard(
                    title = "Incidents",
                    value = "${incidents.size}",
                    subtitle = "24h Volume",
                    accentColor = CoastalBlue,
                    icon = Icons.Default.Warning,
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "Critical",
                    value = "$criticalCount",
                    subtitle = "Requires Action",
                    accentColor = CriticalRed,
                    icon = Icons.Default.LocalFireDepartment,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCard(
                    title = "Patrols",
                    value = "$activePatrolsCount",
                    subtitle = "On Active Duty",
                    accentColor = VerifiedGreen,
                    icon = Icons.Default.DirectionsCar,
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "Risk Zones",
                    value = "${riskScores.size}",
                    subtitle = "AI Hotspots",
                    accentColor = DeepWarningAmber,
                    icon = Icons.Default.Analytics,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Geospatial HUD Canvas
        item {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "SPATIAL SITUATION MAP",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = TextSecondary
                    )
                    Text(
                        text = "TAP MAP FOR FULL GIS",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = CoastalBlue,
                        modifier = Modifier.clickable { viewModel.navigateTo("INTELLIGENCE") }
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                CyberSpatialCanvas(
                    incidents = incidents,
                    patrols = patrols,
                    riskScores = riskScores
                )
            }
        }

        // Filter Chips Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                listOf("ALL", "CRITICAL", "HIGH", "MEDIUM").forEach { filter ->
                    val isSelected = selectedSeverityFilter == filter
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedSeverityFilter = filter },
                        label = {
                            Text(
                                text = filter,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = CoastalBlue,
                            selectedLabelColor = CardSurface
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            borderColor = if (isSelected) CoastalBlue else NeutralBorder,
                            enabled = true,
                            selected = isSelected
                        ),
                        shape = RoundedCornerShape(6.dp)
                    )
                }
            }
        }

        // Live Incident Feed Section
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "ACTIVE INCIDENT QUEUE (${filteredIncidents.size})",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = TextSecondary
                )
                IconButton(onClick = { viewModel.refreshIncidents() }, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = CoastalBlue, modifier = Modifier.size(16.dp))
                }
            }
        }

        items(filteredIncidents, key = { it.id }) { incident ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, NeutralBorder, RoundedCornerShape(8.dp))
                    .clickable { selectedIncidentForModal = incident },
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SeverityBadge(severity = incident.severity)
                        StatusChip(status = incident.status)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = incident.title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = incident.description,
                        fontSize = 12.sp,
                        color = TextSecondary,
                        maxLines = 2
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = CoastalBlue, modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(text = incident.location_name, fontSize = 11.sp, color = TextMuted)
                        }
                        Text(
                            text = incident.police_station_name ?: "Station",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            color = CoastalBlue,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    // Incident Triage Dialog
    if (selectedIncidentForModal != null) {
        val inc = selectedIncidentForModal!!
        AlertDialog(
            onDismissRequest = { selectedIncidentForModal = null },
            title = {
                Column {
                    SeverityBadge(severity = inc.severity)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(inc.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            },
            text = {
                Column {
                    Text(inc.description, fontSize = 13.sp, color = TextPrimary)
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Location: ${inc.location_name} (${inc.latitude}, ${inc.longitude})", fontSize = 12.sp, color = TextSecondary)
                    Text("Station: ${inc.police_station_name}", fontSize = 12.sp, color = TextSecondary)
                    Text("Status: ${inc.status}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = CoastalBlue)
                    Spacer(modifier = Modifier.height(14.dp))
                    Text("UPDATE INCIDENT STATUS:", fontSize = 10.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Button(
                            onClick = {
                                viewModel.updateIncidentStatus(inc.id, "IN_PROGRESS")
                                selectedIncidentForModal = null
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(4.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue)
                        ) {
                            Text("Dispatch", fontSize = 10.sp)
                        }
                        Button(
                            onClick = {
                                viewModel.updateIncidentStatus(inc.id, "RESOLVED")
                                selectedIncidentForModal = null
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(4.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VerifiedGreen)
                        ) {
                            Text("Resolve", fontSize = 10.sp)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedIncidentForModal = null }) {
                    Text("Close")
                }
            }
        )
    }
}
