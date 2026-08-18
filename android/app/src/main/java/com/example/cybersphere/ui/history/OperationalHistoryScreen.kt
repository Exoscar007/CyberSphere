package com.example.cybersphere.ui.history

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.cybersphere.data.models.OperationalHistoryItem
import com.example.cybersphere.theme.*
import com.example.cybersphere.ui.MainViewModel
import com.example.cybersphere.ui.components.SeverityBadge
import com.example.cybersphere.ui.components.StatusChip

@Composable
fun OperationalHistoryScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val historyItems by viewModel.operationalHistory.collectAsState()
    var selectedItemForAudit by remember { mutableStateOf<OperationalHistoryItem?>(null) }

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
                text = "OPERATIONAL HISTORY & AUDIT TRAIL",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = CoastalBlue
            )
            Text(
                text = "Completed Law Enforcement Operations & Case Resolution",
                fontSize = 11.sp,
                color = TextMuted
            )
        }

        items(historyItems, key = { it.id }) { item ->
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
                        SeverityBadge(severity = item.severity)
                        StatusChip(status = item.status)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = item.title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = TextPrimary
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = item.resolution_summary,
                        fontSize = 12.sp,
                        color = TextSecondary
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Lead: ${item.officer_name}",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                        Text(
                            text = "Closed: ${item.closed_at}",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = TextSecondary
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Button(
                        onClick = { selectedItemForAudit = item },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = CoastalBlueLight),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text("View Complete Case Audit Trail", color = CoastalBlueHover, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    if (selectedItemForAudit != null) {
        val audit = selectedItemForAudit!!
        AlertDialog(
            onDismissRequest = { selectedItemForAudit = null },
            title = { Text("Incident Audit: ${audit.title}", fontWeight = FontWeight.Bold, fontSize = 15.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("• Incident Logged by Dispatch: 2026-08-15 02:40", fontSize = 12.sp, color = TextSecondary)
                    Text("• Nearest Patrol Dispatched (Sector 1): 2026-08-15 02:42", fontSize = 12.sp, color = TextSecondary)
                    Text("• On-Scene Arrival Confirmed: 2026-08-15 02:47", fontSize = 12.sp, color = TextSecondary)
                    Text("• 4 Forensic Evidence Items Logged & Sealed", fontSize = 12.sp, color = CoastalBlue)
                    Text("• Status Transition: IN_PROGRESS -> RESOLVED -> CLOSED", fontSize = 12.sp, color = VerifiedGreen, fontWeight = FontWeight.Bold)
                    Text("• Final Resolution: ${audit.resolution_summary}", fontSize = 12.sp, color = TextPrimary)
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedItemForAudit = null }) {
                    Text("Close")
                }
            }
        )
    }
}
