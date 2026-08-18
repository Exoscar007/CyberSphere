package com.example.cybersphere.ui.intelligence

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.cybersphere.data.models.AiJobStatus
import com.example.cybersphere.theme.*
import com.example.cybersphere.ui.MainViewModel

@Composable
fun IntelligenceScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val riskScores by viewModel.riskScores.collectAsState()
    val trends by viewModel.temporalTrends.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var lastAiResult by remember { mutableStateOf<AiJobStatus?>(null) }

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
                text = "AI INTELLIGENCE & CRIME FORECASTING",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = CoastalBlue
            )
            Text(
                text = "Predictive Hotspot Modeling & Temporal Risk Analysis",
                fontSize = 11.sp,
                color = TextMuted
            )
        }

        // AI Model Retraining Trigger Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, NeutralBorder, RoundedCornerShape(8.dp)),
                colors = CardDefaults.cardColors(containerColor = AbyssalNavy),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Psychology, contentDescription = null, tint = WarningAmber, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "PREDICTIVE ML PIPELINE",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = WarningAmber
                            )
                        }

                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = CardSurface.copy(alpha = 0.15f)
                        ) {
                            Text(
                                text = "ONLINE",
                                fontSize = 9.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                color = VerifiedGreen,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Triggers asynchronous spatial regression and clustering over 30-day PostGIS incident records.",
                        fontSize = 12.sp,
                        color = TextOnDark
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = {
                            viewModel.triggerAiRetrain { status ->
                                lastAiResult = status
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = CoastalBlue),
                        shape = RoundedCornerShape(6.dp),
                        enabled = !isLoading
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(color = CardSurface, modifier = Modifier.size(18.dp))
                        } else {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Retrain AI Model On Latest Data", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    if (lastAiResult != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = CardSurface.copy(alpha = 0.12f)
                        ) {
                            Text(
                                text = "✅ ${(lastAiResult?.message ?: "")} (Accuracy ${(lastAiResult?.accuracy ?: 0.91) * 100}%)",
                                fontSize = 11.sp,
                                color = VerifiedGreen,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }
                }
            }
        }

        // Zone Risk Score Ranking
        item {
            Text(
                text = "PREDICTED RISK SCORES BY JURISDICTIONAL ZONE",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = TextSecondary
            )
        }

        items(riskScores, key = { it.zone_id }) { risk ->
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
                        Text(
                            text = risk.zone_name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = TextPrimary
                        )

                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (risk.risk_score > 0.7) CriticalRedLight else WarningAmberLight
                        ) {
                            Text(
                                text = "${(risk.risk_score * 100).toInt()}% RISK",
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (risk.risk_score > 0.7) CriticalRed else DeepWarningAmber,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    LinearProgressIndicator(
                        progress = { risk.risk_score.toFloat() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = if (risk.risk_score > 0.7) CriticalRed else WarningAmber,
                        trackColor = CanvasChalk
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Historical Crimes: ${risk.historical_crimes_count}",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                        Text(
                            text = "Predicted Type: ${risk.predicted_incident_type}",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = CoastalBlue
                        )
                    }
                }
            }
        }

        // Temporal Analysis
        item {
            Text(
                text = "TEMPORAL PEAK CRIME PATTERNS",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = TextSecondary
            )
        }

        items(trends, key = { "${it.day_of_week}_${it.hour_bucket}" }) { trend ->
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
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "${trend.day_of_week} • ${trend.hour_bucket}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = TextPrimary
                        )
                        Text(
                            text = "${trend.incident_count} Incidents recorded in window",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }

                    Text(
                        text = "Index ${(trend.risk_index * 10).toInt()}/10",
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = if (trend.risk_index > 0.8) CriticalRed else CoastalBlue
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
