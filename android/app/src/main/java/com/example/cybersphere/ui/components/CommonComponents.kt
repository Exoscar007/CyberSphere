package com.example.cybersphere.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.cybersphere.data.models.Incident
import com.example.cybersphere.data.models.PatrolAssignment
import com.example.cybersphere.data.models.RiskScore
import com.example.cybersphere.data.network.TelemetryState
import com.example.cybersphere.theme.*

@Composable
fun StatCard(
    title: String,
    value: String,
    subtitle: String,
    accentColor: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, NeutralBorder, RoundedCornerShape(8.dp)),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        shape = RoundedCornerShape(8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title.uppercase(),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = TextSecondary,
                    letterSpacing = 0.5.sp
                )
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(accentColor.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = accentColor,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                fontSize = 12.sp,
                color = TextMuted
            )
        }
    }
}

@Composable
fun TelemetryHudPill(
    state: TelemetryState,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    val (bgColor, dotColor, text) = when (state) {
        TelemetryState.LIVE -> Triple(VerifiedGreenLight, VerifiedGreen, "LIVE TELEMETRY")
        TelemetryState.RECONNECTING -> Triple(WarningAmberLight, DeepWarningAmber, "RECONNECTING")
        TelemetryState.OFFLINE -> Triple(CanvasChalk, TextMuted, "LOCAL MOCK STREAM")
    }

    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .border(1.dp, dotColor.copy(alpha = 0.4f), RoundedCornerShape(999.dp)),
        color = bgColor,
        shape = RoundedCornerShape(999.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(if (state == TelemetryState.LIVE) dotColor.copy(alpha = alpha) else dotColor)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = text,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = dotColor,
                letterSpacing = 0.5.sp
            )
        }
    }
}

@Composable
fun SeverityBadge(
    severity: String,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor) = when (severity.uppercase()) {
        "CRITICAL" -> Pair(CriticalRedLight, CriticalRed)
        "HIGH" -> Pair(WarningAmberLight, DeepWarningAmber)
        "MEDIUM" -> Pair(WarningAmberLight, WarningAmber)
        "LOW" -> Pair(VerifiedGreenLight, VerifiedGreen)
        else -> Pair(CanvasChalk, TextSecondary)
    }

    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .border(1.dp, textColor.copy(alpha = 0.3f), RoundedCornerShape(4.dp)),
        color = bgColor,
        shape = RoundedCornerShape(4.dp)
    ) {
        Text(
            text = severity.uppercase(),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace,
            color = textColor,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

@Composable
fun StatusChip(
    status: String,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor) = when (status.uppercase()) {
        "REPORTED" -> Pair(CriticalRedLight, CriticalRed)
        "VERIFIED" -> Pair(WarningAmberLight, DeepWarningAmber)
        "IN_PROGRESS" -> Pair(CoastalBlueLight, CoastalBlue)
        "RESOLVED", "CLOSED", "CHARGESHEET" -> Pair(VerifiedGreenLight, VerifiedGreen)
        else -> Pair(CanvasChalk, TextSecondary)
    }

    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp)),
        color = bgColor,
        shape = RoundedCornerShape(4.dp)
    ) {
        Text(
            text = status.replace("_", " ").uppercase(),
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            fontFamily = FontFamily.Monospace,
            color = textColor,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

@Composable
fun CyberSpatialCanvas(
    incidents: List<Incident>,
    patrols: List<PatrolAssignment>,
    riskScores: List<RiskScore>,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(220.dp)
            .border(1.dp, NeutralBorder, RoundedCornerShape(8.dp)),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = AbyssalNavy)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val canvasWidth = size.width
                val canvasHeight = size.height

                // Draw Grid Lines (Command HUD grid)
                val gridColor = Color(0xFF26374A)
                for (x in 0..(canvasWidth.toInt()) step 60) {
                    drawLine(gridColor, Offset(x.toFloat(), 0f), Offset(x.toFloat(), canvasHeight), strokeWidth = 1f)
                }
                for (y in 0..(canvasHeight.toInt()) step 60) {
                    drawLine(gridColor, Offset(0f, y.toFloat()), Offset(canvasWidth, y.toFloat()), strokeWidth = 1f)
                }

                // Draw River / Spatial Outline (Sabarmati River aesthetic)
                val riverPath = Path().apply {
                    moveTo(canvasWidth * 0.45f, 0f)
                    quadraticTo(canvasWidth * 0.48f, canvasHeight * 0.5f, canvasWidth * 0.42f, canvasHeight)
                }
                drawPath(riverPath, color = CoastalBlue.copy(alpha = 0.35f), style = Stroke(width = 12f))

                // Draw Risk Zones (Hotspots)
                riskScores.forEachIndexed { index, score ->
                    val cx = (0.2f + (index * 0.16f)) * canvasWidth
                    val cy = (0.3f + ((index % 3) * 0.22f)) * canvasHeight
                    val radius = (score.risk_score * 45).toFloat()
                    val heatColor = if (score.risk_score > 0.7) CriticalRed else WarningAmber
                    drawCircle(color = heatColor.copy(alpha = 0.22f), radius = radius, center = Offset(cx, cy))
                    drawCircle(color = heatColor.copy(alpha = 0.5f), radius = radius * 0.5f, center = Offset(cx, cy))
                }

                // Draw Patrol Units (Green Markers & Trails)
                patrols.forEachIndexed { index, patrol ->
                    val px = (0.3f + (index * 0.25f)) * canvasWidth
                    val py = (0.4f + (index * 0.2f)) * canvasHeight

                    // Breadcrumb trail
                    drawLine(
                        color = VerifiedGreen.copy(alpha = 0.6f),
                        start = Offset(px - 30, py + 20),
                        end = Offset(px, py),
                        strokeWidth = 3f
                    )
                    drawCircle(color = VerifiedGreen, radius = 6f, center = Offset(px, py))
                    drawCircle(color = CardSurface, radius = 2f, center = Offset(px, py))
                }

                // Draw Active Critical Incident Marker (Red Pulsing Star/Circle)
                incidents.firstOrNull { it.severity == "CRITICAL" }?.let {
                    val ix = canvasWidth * 0.38f
                    val iy = canvasHeight * 0.42f
                    drawCircle(color = CriticalRed.copy(alpha = 0.4f), radius = 18f, center = Offset(ix, iy))
                    drawCircle(color = CriticalRed, radius = 7f, center = Offset(ix, iy))
                    drawCircle(color = CardSurface, radius = 2.5f, center = Offset(ix, iy))
                }
            }

            // Top-left HUD Legend Overlay
            Row(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(AbyssalNavy.copy(alpha = 0.85f))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(CriticalRed))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Hotspots", color = TextOnDark, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                Spacer(modifier = Modifier.width(10.dp))
                Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(VerifiedGreen))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Patrols", color = TextOnDark, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
            }

            // Bottom-right GPS Coordinates
            Text(
                text = "AHMEDABAD JURISDICTION | 23.0225° N, 72.5714° E",
                color = TextOnDark.copy(alpha = 0.6f),
                fontSize = 9.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(8.dp)
            )
        }
    }
}
