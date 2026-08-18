package com.example.cybersphere.ui.crimes

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.cybersphere.data.models.Evidence
import com.example.cybersphere.theme.*
import com.example.cybersphere.ui.MainViewModel
import kotlinx.coroutines.launch

@Composable
fun EvidenceScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    var evidenceList by remember { mutableStateOf<List<Evidence>>(emptyList()) }
    var selectedEvidence by remember { mutableStateOf<Evidence?>(null) }
    var showUploadModal by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        evidenceList = viewModel.repository.getEvidence(1)
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
                        text = "FORENSIC EVIDENCE LOCKER",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = CoastalBlue
                    )
                    Text(
                        text = "Chain-of-Custody & Digital Vault",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }

                Button(
                    onClick = { showUploadModal = true },
                    colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Icon(Icons.Default.Upload, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Upload", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        items(evidenceList, key = { it.id }) { evidence ->
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
                            Icon(
                                imageVector = when (evidence.evidence_type) {
                                    "VIDEO" -> Icons.Default.Videocam
                                    "FORENSIC" -> Icons.Default.Biotech
                                    "DOCUMENT" -> Icons.Default.Description
                                    else -> Icons.Default.Image
                                },
                                contentDescription = null,
                                tint = CoastalBlue,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = evidence.title,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = TextPrimary
                            )
                        }

                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = CoastalBlueLight
                        ) {
                            Text(
                                text = evidence.evidence_type,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                color = CoastalBlueHover,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = evidence.description,
                        fontSize = 12.sp,
                        color = TextSecondary
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Collected By: ${evidence.collected_by_name}",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                        Text(
                            text = evidence.file_size,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Chain of Custody steps
                    Text(
                        text = "CHAIN OF CUSTODY LOG:",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(3.dp))
                    evidence.chain_of_custody.forEach { step ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = VerifiedGreen, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(step, fontSize = 11.sp, color = TextSecondary)
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    if (showUploadModal) {
        var title by remember { mutableStateOf("") }
        var desc by remember { mutableStateOf("") }
        var type by remember { mutableStateOf("PHOTO") }

        AlertDialog(
            onDismissRequest = { showUploadModal = false },
            title = { Text("Log New Case Evidence", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("Evidence Label") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = desc,
                        onValueChange = { desc = it },
                        label = { Text("Forensic Notes") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (title.isNotBlank()) {
                            val newEv = Evidence(
                                id = (10..999).random(),
                                incident = 1,
                                title = title,
                                description = desc,
                                evidence_type = type,
                                file_name = "evidence_${title.lowercase().replace(" ", "_")}.dat",
                                file_size = "1.8 MB",
                                collected_by_name = viewModel.currentUser.value?.username ?: "Officer",
                                collected_at = "Just now",
                                chain_of_custody = listOf("Logged into Mobile Vault", "Cryptographically Signed")
                            )
                            evidenceList = listOf(newEv) + evidenceList
                            showUploadModal = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue)
                ) {
                    Text("Seal & Store")
                }
            },
            dismissButton = {
                TextButton(onClick = { showUploadModal = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
