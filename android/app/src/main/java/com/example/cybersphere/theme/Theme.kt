package com.example.cybersphere.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = CoastalBlue,
    onPrimary = CardSurface,
    primaryContainer = CoastalBlueLight,
    onPrimaryContainer = CoastalBlueHover,
    secondary = AbyssalNavy,
    onSecondary = CardSurface,
    secondaryContainer = CanvasChalk,
    onSecondaryContainer = AbyssalNavy,
    tertiary = VerifiedGreen,
    onTertiary = CardSurface,
    tertiaryContainer = VerifiedGreenLight,
    onTertiaryContainer = VerifiedGreen,
    error = CriticalRed,
    onError = CardSurface,
    errorContainer = CriticalRedLight,
    onErrorContainer = CriticalRed,
    background = CanvasAlabaster,
    onBackground = TextPrimary,
    surface = CardSurface,
    onSurface = TextPrimary,
    surfaceVariant = CanvasChalk,
    onSurfaceVariant = TextSecondary,
    outline = NeutralBorder,
    outlineVariant = NeutralBorderSubtle
)

@Composable
fun CyberSphereTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = AbyssalNavy.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
