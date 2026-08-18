package com.example.cybersphere

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.example.cybersphere.theme.CanvasAlabaster
import com.example.cybersphere.theme.CyberSphereTheme
import com.example.cybersphere.ui.AppNavigation
import com.example.cybersphere.ui.MainViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CyberSphereTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = CanvasAlabaster
                ) {
                    AppNavigation(viewModel = viewModel)
                }
            }
        }
    }
}
