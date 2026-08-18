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
fun StationConsoleScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val incidents by viewModel.incidents.collectAsState()
    val patrols by viewModel.patrols.collectAsState()
    val user by viewModel.currentUser.collectAsState()
    val telemetryState by viewModel.telemetryState.collectAsState()

    var showNewIncidentDialog by remember { mutableStateOf(false) }

    val stationIncidents = remember(incidents, user) {
        val stationId = user?.station_id ?: 1
        incidents.filter { it.police_station == stationId }
    }

    val activePatrols = remember(patrols) {
        patrols.filter { it.status == "ACTIVE" }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(CanvasAlabaster)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = (user?.station_name ?: "NAVRANGPURA POLICE STATION").uppercase(),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = CoastalBlue
                    )
                    Text(
                        text = "Jurisdictional Dispatch & Triage Console",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }
                TelemetryHudPill(state = telemetryState)
            }
        }

        // Station Quick Action Cards
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCard(
                    title = "Station Queue",
                    value = "${stationIncidents.size}",
                    subtitle = "Pending Triage",
                    accentColor = CoastalBlue,
                    icon = Icons.Default.FormatListBulleted,
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "Patrols",
                    value = "${activePatrols.size}",
                    subtitle = "In Sector",
                    accentColor = VerifiedGreen,
                    icon = Icons.Default.DirectionsCar,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Primary Dispatch / Action Buttons
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { showNewIncidentDialog = true },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Log Incident", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = { viewModel.navigateTo("PATROL_DISPATCH") },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = AbyssalNavy),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Dispatch Unit", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Station Queue List
        item {
            Text(
                text = "PRIORITY STATION INCIDENTS",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = TextSecondary
            )
        }

        items(stationIncidents, key = { it.id }) { incident ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, NeutralBorder, RoundedCornerShape(8.dp)),
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
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (incident.status == "REPORTED") {
                            Button(
                                onClick = { viewModel.updateIncidentStatus(incident.id, "VERIFIED") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(4.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = DeepWarningAmber)
                            ) {
                                Text("Verify", fontSize = 11.sp)
                            }
                        }
                        if (incident.status != "IN_PROGRESS" && incident.status != "RESOLVED") {
                            Button(
                                onClick = { viewModel.updateIncidentStatus(incident.id, "IN_PROGRESS") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(4.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue)
                            ) {
                                Text("Dispatch Patrol", fontSize = 11.sp)
                            }
                        }
                        if (incident.status == "IN_PROGRESS") {
                            Button(
                                onClick = { viewModel.updateIncidentStatus(incident.id, "RESOLVED") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(4.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = VerifiedGreen)
                            ) {
                                Text("Mark Resolved", fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    // New Incident Dialog
    if (showNewIncidentDialog) {
        var title by remember { mutableStateOf("") }
        var type by remember { mutableStateOf("THEFT") }
        var severity by remember { mutableStateOf("HIGH") }
        var location by remember { mutableStateOf("Navrangpura Crossroad") }
        var desc by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showNewIncidentDialog = false },
            title = { Text("Log Station Incident", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("Incident Title") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = location,
                        onValueChange = { location = it },
                        label = { Text("Location Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = desc,
                        onValueChange = { desc = it },
                        label = { Text("Operational Narrative") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (title.isNotBlank()) {
                            viewModel.createIncident(
                                title = title,
                                type = type,
                                severity = severity,
                                lat = 23.0365,
                                lng = 72.5611,
                                locationName = location,
                                description = desc
                            )
                            showNewIncidentDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue)
                ) {
                    Text("Submit & Broadcast")
                }
            },
            dismissButton = {
                TextButton(onClick = { showNewIncidentDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
