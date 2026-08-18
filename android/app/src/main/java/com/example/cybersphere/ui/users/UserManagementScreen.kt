package com.example.cybersphere.ui.users

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
import com.example.cybersphere.data.models.User
import com.example.cybersphere.theme.*
import com.example.cybersphere.ui.MainViewModel

@Composable
fun UserManagementScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    var usersList by remember {
        mutableStateOf(
            listOf(
                User(1, "admin", "admin@cybersphere.gov.in", "ADMIN", 1, "City Command HQ", "CS-001", "+91 98000 11111", true),
                User(2, "station_navrangpura", "navrangpura@cybersphere.gov.in", "STATION", 1, "Navrangpura PS", "CS-102", "+91 98000 22222", false),
                User(3, "station_vastrapur", "vastrapur@cybersphere.gov.in", "STATION", 2, "Vastrapur PS", "CS-103", "+91 98000 33333", false),
                User(4, "officer_vikram", "vikram@cybersphere.gov.in", "POLICE_OFFICER", 1, "Navrangpura PS", "CS-405", "+91 98000 44444", false),
                User(5, "officer_priya", "priya@cybersphere.gov.in", "POLICE_OFFICER", 2, "Vastrapur PS", "CS-406", "+91 98000 55555", false)
            )
        )
    }

    var showAddUserDialog by remember { mutableStateOf(false) }

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
                        text = "PERSONNEL & ACCESS CONTROL",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = CoastalBlue
                    )
                    Text(
                        text = "Role-Based Officer Accounts & Stations",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }

                Button(
                    onClick = { showAddUserDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add User", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        items(usersList, key = { it.id }) { user ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, NeutralBorder, RoundedCornerShape(8.dp)),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = user.username,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = TextPrimary
                            )
                            if (user.mfa_enabled) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Surface(shape = RoundedCornerShape(3.dp), color = VerifiedGreenLight) {
                                    Text("MFA", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = VerifiedGreen, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                }
                            }
                        }
                        Text(
                            text = "${user.role} • ${user.station_name ?: "HQ"}",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                        Text(
                            text = "Badge: ${user.badge_number ?: "CS-000"} | ${user.email}",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = when (user.role) {
                            "ADMIN" -> CoastalBlueLight
                            "STATION" -> WarningAmberLight
                            else -> VerifiedGreenLight
                        }
                    ) {
                        Text(
                            text = user.role,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = when (user.role) {
                                "ADMIN" -> CoastalBlueHover
                                "STATION" -> DeepWarningAmber
                                else -> VerifiedGreen
                            },
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    if (showAddUserDialog) {
        var uName by remember { mutableStateOf("") }
        var email by remember { mutableStateOf("") }
        var role by remember { mutableStateOf("POLICE_OFFICER") }

        AlertDialog(
            onDismissRequest = { showAddUserDialog = false },
            title = { Text("Create Officer Account", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = uName,
                        onValueChange = { uName = it },
                        label = { Text("Username") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Official Email") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (uName.isNotBlank()) {
                            val newU = User(
                                id = (10..999).random(),
                                username = uName,
                                email = email.ifBlank { "$uName@cybersphere.gov.in" },
                                role = role,
                                station_id = 1,
                                station_name = "Navrangpura PS",
                                badge_number = "CS-${(100..999).random()}"
                            )
                            usersList = usersList + newU
                            showAddUserDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue)
                ) {
                    Text("Create User")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddUserDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
