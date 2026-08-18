package com.example.cybersphere.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.cybersphere.theme.*
import com.example.cybersphere.ui.auth.LoginScreen
import com.example.cybersphere.ui.crimes.EvidenceScreen
import com.example.cybersphere.ui.crimes.FIRScreen
import com.example.cybersphere.ui.dashboard.CityCommandScreen
import com.example.cybersphere.ui.dashboard.StationConsoleScreen
import com.example.cybersphere.ui.history.OperationalHistoryScreen
import com.example.cybersphere.ui.intelligence.IntelligenceScreen
import com.example.cybersphere.ui.patrol.PatrolDispatchScreen
import com.example.cybersphere.ui.reports.SystemHealthScreen
import com.example.cybersphere.ui.users.UserManagementScreen
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

data class NavigationTab(
    val route: String,
    val title: String,
    val icon: ImageVector
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavigation(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val currentScreen by viewModel.currentScreen.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val currentRole by viewModel.currentRole.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var showProfileMenu by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.toastMessage.collectLatest { msg ->
            snackbarHostState.showSnackbar(msg)
        }
    }

    if (currentScreen == "LOGIN") {
        LoginScreen(viewModel = viewModel)
        return
    }

    val adminTabs = listOf(
        NavigationTab("CITY_OVERVIEW", "Overview", Icons.Default.Dashboard),
        NavigationTab("INTELLIGENCE", "AI Intel", Icons.Default.Psychology),
        NavigationTab("FIRS", "FIRs", Icons.Default.Description),
        NavigationTab("PATROL_DISPATCH", "Patrols", Icons.Default.DirectionsCar),
        NavigationTab("HISTORY", "History", Icons.Default.History),
        NavigationTab("USERS", "Admin", Icons.Default.ManageAccounts)
    )

    val stationTabs = listOf(
        NavigationTab("STATION_OVERVIEW", "Console", Icons.Default.LocalPolice),
        NavigationTab("PATROL_DISPATCH", "Patrols", Icons.Default.DirectionsCar),
        NavigationTab("FIRS", "FIRs", Icons.Default.Description),
        NavigationTab("EVIDENCE", "Evidence", Icons.Default.Biotech),
        NavigationTab("HISTORY", "History", Icons.Default.History)
    )

    val officerTabs = listOf(
        NavigationTab("STATION_OVERVIEW", "Workspace", Icons.Default.Shield),
        NavigationTab("FIRS", "FIRs", Icons.Default.Description),
        NavigationTab("EVIDENCE", "Evidence", Icons.Default.Biotech),
        NavigationTab("PATROL_DISPATCH", "GPS", Icons.Default.GpsFixed)
    )

    val activeTabs = when (currentRole) {
        "ADMIN" -> adminTabs
        "STATION" -> stationTabs
        else -> officerTabs
    }

    Scaffold(
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Security,
                            contentDescription = null,
                            tint = WarningAmber,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "CYBERSPHERE",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.ExtraBold,
                            fontFamily = FontFamily.SansSerif,
                            letterSpacing = 1.sp,
                            color = TextOnDark
                        )
                    }
                },
                actions = {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = CoastalBlue
                    ) {
                        Text(
                            text = currentRole,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = TextOnDark,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    IconButton(onClick = { showProfileMenu = !showProfileMenu }) {
                        Icon(Icons.Default.AccountCircle, contentDescription = "Profile", tint = TextOnDark)
                    }

                    DropdownMenu(
                        expanded = showProfileMenu,
                        onDismissRequest = { showProfileMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Logged in as: ${currentUser?.username}") },
                            onClick = {}
                        )
                        DropdownMenuItem(
                            text = { Text("Switch to Admin View") },
                            onClick = {
                                showProfileMenu = false
                                viewModel.switchRoleForDemo("ADMIN")
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Switch to Station View") },
                            onClick = {
                                showProfileMenu = false
                                viewModel.switchRoleForDemo("STATION")
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Switch to Officer View") },
                            onClick = {
                                showProfileMenu = false
                                viewModel.switchRoleForDemo("OFFICER")
                            }
                        )
                        Divider()
                        DropdownMenuItem(
                            text = { Text("System Health Telemetry") },
                            onClick = {
                                showProfileMenu = false
                                viewModel.navigateTo("SYSTEM_HEALTH")
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Sign Out", color = CriticalRed) },
                            onClick = {
                                showProfileMenu = false
                                viewModel.performLogout()
                            }
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AbyssalNavy,
                    titleContentColor = TextOnDark
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = CardSurface,
                tonalElevation = 0.dp
            ) {
                activeTabs.forEach { tab ->
                    val isSelected = currentScreen == tab.route
                    NavigationBarItem(
                        selected = isSelected,
                        onClick = { viewModel.navigateTo(tab.route) },
                        icon = {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = tab.title,
                                modifier = Modifier.size(20.dp)
                            )
                        },
                        label = {
                            Text(
                                text = tab.title,
                                fontSize = 10.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CoastalBlue,
                            selectedTextColor = CoastalBlue,
                            indicatorColor = CoastalBlueLight,
                            unselectedIconColor = TextSecondary,
                            unselectedTextColor = TextSecondary
                        )
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            when (currentScreen) {
                "CITY_OVERVIEW" -> CityCommandScreen(viewModel = viewModel)
                "STATION_OVERVIEW" -> StationConsoleScreen(viewModel = viewModel)
                "OFFICER_WORKSPACE" -> StationConsoleScreen(viewModel = viewModel)
                "INTELLIGENCE" -> IntelligenceScreen(viewModel = viewModel)
                "FIRS" -> FIRScreen(viewModel = viewModel)
                "PATROL_DISPATCH" -> PatrolDispatchScreen(viewModel = viewModel)
                "EVIDENCE" -> EvidenceScreen(viewModel = viewModel)
                "HISTORY" -> OperationalHistoryScreen(viewModel = viewModel)
                "USERS" -> UserManagementScreen(viewModel = viewModel)
                "SYSTEM_HEALTH" -> SystemHealthScreen(viewModel = viewModel)
                else -> CityCommandScreen(viewModel = viewModel)
            }
        }
    }
}
