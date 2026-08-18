package com.example.cybersphere.ui.crimes

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
import com.example.cybersphere.data.models.FIR
import com.example.cybersphere.theme.*
import com.example.cybersphere.ui.MainViewModel
import com.example.cybersphere.ui.components.StatusChip

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FIRScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val firs by viewModel.firs.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var selectedFIR by remember { mutableStateOf<FIR?>(null) }
    var showCreateDialog by remember { mutableStateOf(false) }

    val filteredFIRs = remember(firs, searchQuery) {
        if (searchQuery.isBlank()) firs
        else firs.filter {
            it.fir_number.contains(searchQuery, ignoreCase = true) ||
            it.complainant_name.contains(searchQuery, ignoreCase = true) ||
            it.description.contains(searchQuery, ignoreCase = true)
        }
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
                        text = "FIRST INFORMATION REPORTS",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = CoastalBlue
                    )
                    Text(
                        text = "Statutory Police Records & Charge Sheets",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }

                Button(
                    onClick = { showCreateDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("File FIR", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Search Bar
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search by FIR #, Complainant or IPC...", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = CoastalBlue) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear", tint = TextMuted)
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = CardSurface,
                    unfocusedContainerColor = CardSurface,
                    focusedBorderColor = CoastalBlue,
                    unfocusedBorderColor = NeutralBorder
                )
            )
        }

        items(filteredFIRs, key = { it.id }) { fir ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, NeutralBorder, RoundedCornerShape(8.dp))
                    .clickable { selectedFIR = fir },
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = fir.fir_number,
                            fontWeight = FontWeight.ExtraBold,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 13.sp,
                            color = CoastalBlue
                        )
                        StatusChip(status = fir.status)
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Complainant: ${fir.complainant_name}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = TextPrimary
                    )

                    Text(
                        text = fir.description,
                        fontSize = 12.sp,
                        color = TextSecondary,
                        maxLines = 2
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // IPC Section Tags
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        fir.ipc_sections.forEach { section ->
                            Surface(
                                shape = RoundedCornerShape(3.dp),
                                color = CoastalBlueLight
                            ) {
                                Text(
                                    text = section,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = CoastalBlueHover,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = fir.location_name.ifBlank { "Ahmedabad Jurisdiction" },
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                        Text(
                            text = fir.police_station_name ?: "Navrangpura PS",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    // View FIR Detail Modal
    if (selectedFIR != null) {
        val fir = selectedFIR!!
        AlertDialog(
            onDismissRequest = { selectedFIR = null },
            title = {
                Column {
                    Text(fir.fir_number, fontWeight = FontWeight.Bold, color = CoastalBlue, fontFamily = FontFamily.Monospace)
                    Text("Filed on: ${fir.created_at}", fontSize = 11.sp, color = TextMuted)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Complainant: ${fir.complainant_name} (${fir.complainant_contact})", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text("Accused / Suspects: ${fir.accused_name}", fontSize = 13.sp, color = CriticalRed)
                    Text("Description: ${fir.description}", fontSize = 12.sp, color = TextSecondary)
                    Text("Applicable Acts: ${fir.ipc_sections.joinToString(", ")}", fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = CoastalBlue)
                    Text("Jurisdiction: ${fir.police_station_name} (${fir.location_name})", fontSize = 12.sp, color = TextSecondary)
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedFIR = null }) {
                    Text("Close")
                }
            }
        )
    }

    // Create FIR Modal
    if (showCreateDialog) {
        var complainant by remember { mutableStateOf("") }
        var contact by remember { mutableStateOf("") }
        var accused by remember { mutableStateOf("Unknown Suspects") }
        var type by remember { mutableStateOf("THEFT") }
        var ipcText by remember { mutableStateOf("IPC 379, IPC 34") }
        var location by remember { mutableStateOf("Commerce Six Roads, Navrangpura") }
        var description by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showCreateDialog = false },
            title = { Text("Register Official FIR", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = complainant,
                        onValueChange = { complainant = it },
                        label = { Text("Complainant Full Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = contact,
                        onValueChange = { contact = it },
                        label = { Text("Contact Phone") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = accused,
                        onValueChange = { accused = it },
                        label = { Text("Accused Name / Description") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = ipcText,
                        onValueChange = { ipcText = it },
                        label = { Text("IPC Sections (comma separated)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = { Text("FIR Narrative / Facts") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (complainant.isNotBlank() && description.isNotBlank()) {
                            val ipcList = ipcText.split(",").map { it.trim() }
                            viewModel.createFIR(
                                complainant = complainant,
                                contact = contact,
                                accused = accused,
                                type = type,
                                ipc = ipcList,
                                lat = 23.0365,
                                lng = 72.5611,
                                locationName = location,
                                description = description
                            )
                            showCreateDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue)
                ) {
                    Text("Register FIR")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
