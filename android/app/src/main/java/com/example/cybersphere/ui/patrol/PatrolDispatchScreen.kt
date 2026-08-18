package com.example.cybersphere.ui.patrol

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.example.cybersphere.data.models.PatrolAssignment
import com.example.cybersphere.theme.*
import com.example.cybersphere.ui.MainViewModel

@Composable
fun PatrolDispatchScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val patrols by viewModel.patrols.collectAsState()
    var selectedPatrolForRoute by remember { mutableStateOf<PatrolAssignment?>(null) }
    var recommendedUnitMessage by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(CanvasAlabaster)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "TACTICAL PATROL DISPATCH & GPS",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = CoastalBlue
            )
            Text(
                text = "Live GPS Telemetry & Automated Route Optimization",
                fontSize = 11.sp,
                color = TextMuted
            )
        }

        // Quick AI Recommendation Trigger
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, NeutralBorder, RoundedCornerShape(8.dp)),
                colors = CardDefaults.cardColors(containerColor = AbyssalNavy),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AutoFixHigh, contentDescription = null, tint = WarningAmber, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "AI PATROL RECOMMENDATION",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = WarningAmber
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Compute nearest available patrol unit to active critical incident cluster using PostGIS distance matrices.",
                        fontSize = 12.sp,
                        color = TextOnDark
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = {
                            recommendedUnitMessage = "AI Recommends: Officer Vikram Rathore (B-104) is 1.4 km from Navrangpura Market. Estimated Arrival: 3.8 mins."
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text("Recommend Best Unit", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    if (recommendedUnitMessage != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = CardSurface.copy(alpha = 0.15f)
                        ) {
                            Text(
                                text = recommendedUnitMessage ?: "",
                                fontSize = 11.sp,
                                color = WarningAmber,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }
                }
            }
        }

        item {
            Text(
                text = "ACTIVE PATROL UNITS (${patrols.size})",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = TextSecondary
            )
        }

        items(patrols, key = { it.id }) { patrol ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, NeutralBorder, RoundedCornerShape(8.dp)),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(if (patrol.status == "ACTIVE") VerifiedGreen else TextMuted)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = patrol.officer_name,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = TextPrimary
                            )
                        }

                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (patrol.status == "ACTIVE") VerifiedGreenLight else CanvasChalk
                        ) {
                            Text(
                                text = patrol.status,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                color = if (patrol.status == "ACTIVE") VerifiedGreen else TextSecondary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Assigned: ${patrol.zone_name}",
                        fontSize = 12.sp,
                        color = CoastalBlue,
                        fontWeight = FontWeight.SemiBold
                    )

                    Text(
                        text = "GPS Coordinates: ${patrol.latitude}° N, ${patrol.longitude}° E",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = TextMuted
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { viewModel.sendPatrolPing(patrol.id) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(4.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue)
                        ) {
                            Icon(Icons.Default.GpsFixed, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Simulate GPS Ping", fontSize = 11.sp)
                        }

                        OutlinedButton(
                            onClick = { selectedPatrolForRoute = patrol },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(4.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = CoastalBlue)
                        ) {
                            Icon(Icons.Default.Route, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Route Waypoints", fontSize = 11.sp)
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    // Route Waypoint Modal
    if (selectedPatrolForRoute != null) {
        val p = selectedPatrolForRoute!!
        AlertDialog(
            onDismissRequest = { selectedPatrolForRoute = null },
            title = {
                Text("Optimized Route — ${p.officer_name}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Patrol Zone: ${p.zone_name}", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text("Waypoint 1: Navrangpura Station HQ (Start)", fontSize = 12.sp, color = TextSecondary)
                    Text("Waypoint 2: Commerce Six Roads [High Risk Density]", fontSize = 12.sp, color = CriticalRed)
                    Text("Waypoint 3: Mithakhali Underpass [CCTV Checkpoint]", fontSize = 12.sp, color = TextSecondary)
                    Text("Waypoint 4: CG Road Commercial Corridor", fontSize = 12.sp, color = TextSecondary)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Total Optimized Distance: 4.8 km | ETA: 18 mins", fontFamily = FontFamily.Monospace, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = CoastalBlue)
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedPatrolForRoute = null }) {
                    Text("Close")
                }
            }
        )
    }
}
